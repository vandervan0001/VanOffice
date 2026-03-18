import fs from "node:fs/promises";
import path from "node:path";

import { nanoid } from "nanoid";

import { ensureWorkspaceUploadDirectory } from "@/lib/config";
import {
  appendEvent,
  createWorkspaceRecord,
  getWorkspaceRecord,
  listWorkspaceEvents,
  setWorkspaceStatus,
} from "@/lib/db/client";
import { SHARED_OPERATING_MANUAL, getRoleTemplate } from "@/lib/role-templates";
import { localToolAdapter } from "@/lib/runtime/adapters/tools";
import { projectWorkspaceState } from "@/lib/runtime/projector";
import { clearWorkspaceSchedule, scheduleWorkspaceExecution } from "@/lib/runtime/scheduler";
import type {
  ApprovalGateType,
  ArtifactRecord,
  CreateWorkspaceInput,
  MissionBrief,
  TaskCard,
  TeamMember,
  TeamProposal,
  UploadedFileRecord,
  WorkspaceSnapshot,
} from "@/lib/types";

function slugFromTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildAssumptions(input: CreateWorkspaceInput, fileContents: string[]) {
  const assumptions = [
    input.missionGoal || "The team should optimize for a single measurable outcome.",
    input.outputExpectations || "Outputs should be document-first and reviewable.",
  ];

  if (fileContents.length === 0) {
    assumptions.push("No supporting files were uploaded, so the first pass leans on the written brief only.");
  } else {
    assumptions.push("Uploaded files will be treated as the primary context before web research.");
  }

  assumptions.push(
    "The first team should stay lean and cross-functional unless the brief explicitly requires more headcount.",
  );

  return assumptions;
}

// Keyword → role mapping. Each entry adds a role when any keyword matches.
const ROLE_TRIGGERS: Array<{ keywords: string[]; roleId: string }> = [
  // Research & analysis
  { keywords: ["research", "veille", "investigate", "study", "data", "evidence", "benchmark"], roleId: "research-lead" },
  { keywords: ["data", "metrics", "kpi", "analytics", "numbers", "dashboard", "benchmark"], roleId: "data-analyst" },
  { keywords: ["competitor", "competitive", "landscape", "positioning", "market map"], roleId: "competitive-analyst" },

  // Strategy & planning
  { keywords: ["strategy", "plan", "action", "roadmap", "priorities", "direction"], roleId: "strategy-lead" },
  { keywords: ["project", "timeline", "milestone", "schedule", "coordination", "dependencies"], roleId: "project-manager" },

  // Content & communication
  { keywords: ["content", "blog", "editorial", "article", "seo", "writing", "copy"], roleId: "content-writer" },
  { keywords: ["communication", "press", "pr", "messaging", "narrative", "investor", "stakeholder", "memo", "update"], roleId: "communications-lead" },

  // Design & brand
  { keywords: ["brand", "identity", "visual", "logo", "style guide", "tone"], roleId: "brand-strategist" },
  { keywords: ["ux", "user research", "persona", "journey", "user experience", "interview"], roleId: "ux-researcher" },

  // Marketing
  { keywords: ["marketing", "campaign", "promotion", "go-to-market", "gtm", "channel", "launch"], roleId: "marketing-lead" },

  // Operations & HR
  { keywords: ["onboarding", "culture", "handbook", "policy", "hire", "employee", "team building"], roleId: "hr-specialist" },
  { keywords: ["process", "operations", "workflow", "sop", "documentation", "procedure"], roleId: "operations-lead" },

  // Finance
  { keywords: ["budget", "financial", "forecast", "revenue", "cost", "pricing", "investment", "investor"], roleId: "financial-analyst" },

  // Events
  { keywords: ["event", "conference", "meetup", "launch event", "webinar", "workshop"], roleId: "event-planner" },

  // Advisory
  { keywords: ["advisor", "advisory", "board", "governance", "oversight", "counsel"], roleId: "cfo-advisor" },
  { keywords: ["legal", "compliance", "gdpr", "terms", "contract", "regulation", "ip", "patent"], roleId: "legal-counsel" },
  { keywords: ["growth", "scale", "funnel", "acquisition", "retention", "churn"], roleId: "growth-advisor" },
  { keywords: ["industry", "domain", "sector", "vertical", "market trend"], roleId: "industry-expert" },

  // Sales
  { keywords: ["sales", "selling", "revenue", "deal", "close", "pipeline", "prospection", "prospect"], roleId: "sales-director" },
  { keywords: ["outbound", "cold", "sdr", "sequence", "prospection", "prospect", "lead gen"], roleId: "sdr-lead" },
  { keywords: ["account", "deal", "closing", "negotiation", "pitch", "demo"], roleId: "account-executive" },
  { keywords: ["crm", "sales ops", "enablement", "reporting", "dashboard"], roleId: "sales-ops" },

  // Tech
  { keywords: ["tech", "technology", "stack", "architecture", "infrastructure", "devops", "cloud"], roleId: "cto-advisor" },
  { keywords: ["security", "audit", "vulnerability", "penetration", "hardening", "cyber"], roleId: "security-auditor" },

  // Social & SEO
  { keywords: ["social media", "social", "instagram", "linkedin", "twitter", "tiktok", "community"], roleId: "social-media-manager" },
  { keywords: ["seo", "search engine", "keyword", "organic", "backlink", "ranking"], roleId: "seo-specialist" },

  // Product & Pricing
  { keywords: ["pricing", "price", "monetization", "willingness to pay", "subscription", "freemium"], roleId: "pricing-analyst" },
  { keywords: ["product", "feature", "roadmap", "pmf", "product-market fit", "user feedback"], roleId: "product-analyst" },
];

function deriveRoleIds(brief: string, outputExpectations: string): string[] {
  const lower = `${brief} ${outputExpectations}`.toLowerCase();
  const roleIds = new Set<string>();

  // Always include planner and reviewer
  roleIds.add("mission-planner");
  roleIds.add("editor-reviewer");

  // Match roles based on keywords in the brief
  for (const trigger of ROLE_TRIGGERS) {
    if (trigger.keywords.some((kw) => lower.includes(kw))) {
      roleIds.add(trigger.roleId);
    }
  }

  // If we only have planner + reviewer, add research + strategy as sensible defaults
  if (roleIds.size <= 2) {
    roleIds.add("research-lead");
    roleIds.add("strategy-lead");
  }

  return Array.from(roleIds);
}

function buildSystemPrompt(member: TeamMember) {
  return [
    `You are ${member.displayName}, acting as ${member.title}.`,
    `Mission remit: ${member.responsibilities.join("; ")}.`,
    SHARED_OPERATING_MANUAL,
  ].join("\n\n");
}

// Diverse agent names for larger teams
const AGENT_NAMES = [
  "Avery", "Morgan", "Taylor", "Jordan", "Riley",
  "Casey", "Quinn", "Alex", "Sam", "Jamie",
  "Parker", "Reese", "Skyler", "Drew", "Robin",
  "Charlie", "Dakota", "Emery", "Finley", "Harper",
];

function buildTeamProposal(input: CreateWorkspaceInput, assumptions: string[]): TeamProposal {
  const roleIds = deriveRoleIds(input.rawBrief, input.outputExpectations);

  const roles = roleIds
    .map((roleId) => getRoleTemplate(roleId))
    .filter((template): template is NonNullable<typeof template> => Boolean(template))
    .map((template, index) => {
      const displayName = AGENT_NAMES[index % AGENT_NAMES.length];
      const member: TeamMember = {
        agentId: nanoid(),
        roleId: template.roleId,
        title: template.title,
        displayName,
        responsibilities: [
          template.purpose,
          `Protect these assumptions: ${assumptions.slice(0, 2).join(" / ")}`,
        ],
        rationale: `Included for ${template.skills.slice(0, 2).join(" and ")}.`,
        systemPrompt: "",
        state: "idle",
      };

      member.systemPrompt = buildSystemPrompt(member);
      return member;
    });

  const teamSize = roles.length;
  const rationale = teamSize <= 4
    ? `A lean ${teamSize}-person squad for a focused mission.`
    : teamSize <= 8
      ? `A ${teamSize}-person cross-functional team to cover the mission's breadth.`
      : `A ${teamSize}-person task force — the mission scope requires broad coverage.`;

  // Derive expected outputs from the roles' deliverable types
  const estimatedOutputs = Array.from(
    new Set(roles.flatMap((r) => {
      const tmpl = getRoleTemplate(r.roleId);
      return tmpl ? [tmpl.deliverableTypes[0]] : [];
    }).filter(Boolean)),
  ).map((type) => type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

  return {
    name: `${slugFromTitle(input.missionGoal || "Mission")} Crew`,
    rationale,
    estimatedOutputs,
    roles,
  };
}

// Maps role type to a work phase. Used for task generation and ordering.
const ROLE_WORK_PHASES: Record<string, { phase: number; workType: TaskCard["workType"]; taskTitle: string; taskDesc: string }> = {
  "mission-planner": { phase: 0, workType: "planning", taskTitle: "Frame the mission and sharpen the operating assumptions", taskDesc: "Produce a concise mission framing note before the team branches out." },
  "research-lead": { phase: 1, workType: "researching", taskTitle: "Compile market and evidence signals", taskDesc: "Gather citable signals from the brief and light web research." },
  "data-analyst": { phase: 1, workType: "researching", taskTitle: "Analyze quantitative data and metrics", taskDesc: "Extract insights from available data, benchmarks, and quantitative evidence." },
  "competitive-analyst": { phase: 1, workType: "researching", taskTitle: "Map the competitive landscape", taskDesc: "Identify competitors, positioning gaps, and differentiation opportunities." },
  "ux-researcher": { phase: 1, workType: "researching", taskTitle: "Synthesize user needs and pain points", taskDesc: "Build personas and journey maps from available user context." },
  "strategy-lead": { phase: 2, workType: "writing", taskTitle: "Turn findings into an action plan", taskDesc: "Synthesize the evidence into concrete next steps and recommendations." },
  "content-writer": { phase: 2, workType: "writing", taskTitle: "Draft content deliverables", taskDesc: "Write the content pieces specified in the brief." },
  "communications-lead": { phase: 2, workType: "writing", taskTitle: "Craft messaging and communications", taskDesc: "Develop key messages, narratives, and communication materials." },
  "brand-strategist": { phase: 2, workType: "writing", taskTitle: "Define brand positioning and guidelines", taskDesc: "Establish brand identity, voice, and positioning strategy." },
  "marketing-lead": { phase: 2, workType: "writing", taskTitle: "Design the marketing strategy", taskDesc: "Build the go-to-market plan with channels, timing, and messaging." },
  "project-manager": { phase: 2, workType: "planning", taskTitle: "Build the project timeline and milestones", taskDesc: "Organize work into phases with clear owners and deadlines." },
  "operations-lead": { phase: 2, workType: "writing", taskTitle: "Design operational processes", taskDesc: "Document workflows, procedures, and operational structures." },
  "hr-specialist": { phase: 2, workType: "writing", taskTitle: "Build people-related deliverables", taskDesc: "Create onboarding, culture, or policy documents." },
  "financial-analyst": { phase: 2, workType: "writing", taskTitle: "Prepare financial analysis", taskDesc: "Analyze budgets, forecasts, and financial metrics." },
  "event-planner": { phase: 2, workType: "planning", taskTitle: "Plan event logistics and run-of-show", taskDesc: "Organize venue, timeline, promotion, and logistics." },
  "editor-reviewer": { phase: 3, workType: "writing", taskTitle: "Review the packet and prepare final deliverables", taskDesc: "Edit the artifacts into a clean final packet with explicit review notes." },
  "cfo-advisor": { phase: 1, workType: "researching", taskTitle: "Assess financial risks and fiscal position", taskDesc: "Review financial data, identify risks, and prepare fiscal recommendations." },
  "legal-counsel": { phase: 1, workType: "researching", taskTitle: "Review legal and compliance implications", taskDesc: "Identify legal risks, compliance gaps, and contractual concerns." },
  "growth-advisor": { phase: 2, workType: "writing", taskTitle: "Design growth strategy and funnel optimization", taskDesc: "Identify growth levers and propose scaling strategies." },
  "industry-expert": { phase: 1, workType: "researching", taskTitle: "Provide industry context and trend analysis", taskDesc: "Share domain expertise and map relevant industry trends." },
  "sales-director": { phase: 2, workType: "planning", taskTitle: "Design sales strategy and define ICP", taskDesc: "Structure the sales process and define ideal customer profile." },
  "sdr-lead": { phase: 2, workType: "writing", taskTitle: "Build outbound sequences and templates", taskDesc: "Create prospection playbooks, email sequences, and outreach scripts." },
  "account-executive": { phase: 2, workType: "writing", taskTitle: "Structure deal flow and objection handling", taskDesc: "Build pitch framework, objection handlers, and closing strategies." },
  "sales-ops": { phase: 2, workType: "writing", taskTitle: "Design CRM workflow and reporting", taskDesc: "Structure CRM processes, dashboards, and sales enablement materials." },
  "cto-advisor": { phase: 1, workType: "researching", taskTitle: "Evaluate tech stack and architecture", taskDesc: "Review current technology decisions and recommend improvements." },
  "security-auditor": { phase: 1, workType: "researching", taskTitle: "Assess security posture and vulnerabilities", taskDesc: "Identify security risks and recommend hardening measures." },
  "social-media-manager": { phase: 2, workType: "writing", taskTitle: "Plan social media strategy and calendar", taskDesc: "Design social media presence with content calendar and engagement plan." },
  "seo-specialist": { phase: 2, workType: "writing", taskTitle: "Build SEO and keyword strategy", taskDesc: "Optimize content strategy for search with keyword research and on-page plan." },
  "pricing-analyst": { phase: 1, workType: "researching", taskTitle: "Analyze pricing models and competition", taskDesc: "Research competitive pricing and model willingness-to-pay." },
  "product-analyst": { phase: 1, workType: "researching", taskTitle: "Analyze product-market fit and features", taskDesc: "Assess current product position and prioritize feature opportunities." },
};

function buildTaskBoard(teamProposal: TeamProposal): TaskCard[] {
  const tasks: TaskCard[] = [];

  // Sort roles by work phase
  const sortedRoles = [...teamProposal.roles].sort((a, b) => {
    const phaseA = ROLE_WORK_PHASES[a.roleId]?.phase ?? 2;
    const phaseB = ROLE_WORK_PHASES[b.roleId]?.phase ?? 2;
    return phaseA - phaseB;
  });

  for (const role of sortedRoles) {
    const config = ROLE_WORK_PHASES[role.roleId];
    if (!config) continue;

    const artifactId = role.roleId === "editor-reviewer"
      ? "final-deliverable"
      : role.roleId === "mission-planner"
        ? "mission-summary"
        : `${role.roleId}-output`;

    // Dependencies: phase N depends on all phase N-1 tasks
    const deps = tasks
      .filter((t) => {
        const tRole = sortedRoles.find((r) => r.agentId === t.ownerAgentId);
        const tPhase = tRole ? (ROLE_WORK_PHASES[tRole.roleId]?.phase ?? 2) : 0;
        return tPhase === config.phase - 1;
      })
      .map((t) => t.id);

    // Editor depends on ALL previous tasks
    const finalDeps = role.roleId === "editor-reviewer"
      ? tasks.map((t) => t.id)
      : deps;

    tasks.push({
      id: nanoid(),
      title: config.taskTitle,
      ownerAgentId: role.agentId,
      status: "todo",
      description: config.taskDesc,
      workType: config.workType,
      acceptanceCriteria: [
        `Deliverable is complete and ready for review.`,
        `Sources and assumptions are documented.`,
      ],
      dependencies: finalDeps,
      linkedArtifactIds: [artifactId],
    });
  }

  return tasks;
}

async function persistUploads(
  workspaceId: string,
  files: File[],
): Promise<UploadedFileRecord[]> {
  const uploadDir = ensureWorkspaceUploadDirectory(workspaceId);

  return Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileId = nanoid();
      const safeName = `${fileId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const absolutePath = path.join(uploadDir, safeName);
      await fs.writeFile(absolutePath, buffer);

      return {
        id: fileId,
        fileName: file.name,
        relativePath: `${workspaceId}/${safeName}`,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      };
    }),
  );
}

function firstArtifact(title: string, type: string, taskId: string): ArtifactRecord {
  return {
    id: type,
    title,
    type,
    status: "draft",
    schema: "markdown-v1",
    provenance: [taskId],
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: Date.now(),
        content: `# ${title}\n\nDraft pending runtime execution.`,
        notes: "Placeholder created with the task board.",
        sourceTaskIds: [taskId],
        citations: [],
      },
    ],
  };
}

export async function createWorkspaceFromMission(
  input: Omit<CreateWorkspaceInput, "uploadedFiles"> & { files: File[] },
) {
  const workspace = await createWorkspaceRecord({
    title: input.missionGoal || "Untitled mission",
    providerId: input.providerId,
    status: "awaiting_team_approval",
  });

  const uploadedFiles = await persistUploads(workspace.id, input.files);
  const brief: MissionBrief = {
    rawBrief: input.rawBrief,
    missionGoal: input.missionGoal,
    outputExpectations: input.outputExpectations,
    uploadedFiles,
  };

  const fileContents = await localToolAdapter.readBriefFiles(uploadedFiles);
  const assumptions = buildAssumptions(
    {
      ...input,
      uploadedFiles,
    },
    fileContents,
  );
  const summary = `A local-first AI team will tackle “${input.missionGoal || "the submitted mission"}” with a document-heavy workflow and explicit approval gates.`;
  const teamProposal = buildTeamProposal(
    {
      ...input,
      uploadedFiles,
    },
    assumptions,
  );

  await appendEvent(workspace.id, "brief.ingested", brief);
  await appendEvent(workspace.id, "brief.parsed", {
    summary,
    assumptions,
    recommendedOutputs: teamProposal.estimatedOutputs,
  });
  await appendEvent(workspace.id, "team.proposed", { teamProposal });
  await appendEvent(workspace.id, "approval.requested", {
    gateType: "team_proposal",
    message: "Approve the proposed team before generating the execution plan.",
  });

  return getWorkspaceSnapshot(workspace.id);
}

export async function approveGate(
  workspaceId: string,
  gateType: ApprovalGateType,
): Promise<WorkspaceSnapshot> {
  const workspace = await getWorkspaceRecord(workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  await appendEvent(workspaceId, "approval.resolved", { gateType });

  if (gateType === "team_proposal") {
    const snapshot = await getWorkspaceSnapshot(workspaceId);
    const tasks = buildTaskBoard(snapshot.teamProposal!);

    await appendEvent(workspaceId, "task.board.created", { tasks });

    for (const task of tasks) {
      if (task.linkedArtifactIds.length > 0) {
        const artifactId = task.linkedArtifactIds[0];
        // Derive a readable title from the artifact ID
        const artifactTitle = artifactId
          .replace(/-output$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        await appendEvent(workspaceId, "artifact.updated", {
          artifact: firstArtifact(artifactTitle, artifactId, task.id),
        });
      }
    }

    await appendEvent(workspaceId, "approval.requested", {
      gateType: "execution_plan",
      message: "Approve the initial task board before the team starts working.",
    });
    await setWorkspaceStatus(workspaceId, "awaiting_plan_approval");
  } else if (gateType === "execution_plan") {
    await setWorkspaceStatus(workspaceId, "running");
    await scheduleWorkspaceExecution(workspaceId);
  } else if (gateType === "final_deliverables") {
    clearWorkspaceSchedule(workspaceId);
    await appendEvent(workspaceId, "run.completed", {
      outcome: "Deliverables approved by the user.",
    });
    await setWorkspaceStatus(workspaceId, "complete");
  }

  return getWorkspaceSnapshot(workspaceId);
}

export async function getWorkspaceSnapshot(
  workspaceId: string,
): Promise<WorkspaceSnapshot> {
  const workspace = await getWorkspaceRecord(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const events = await listWorkspaceEvents(workspaceId);
  return projectWorkspaceState(workspace, events);
}
