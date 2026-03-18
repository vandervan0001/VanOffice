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
import { SHARED_OPERATING_MANUAL, getRoleTemplate, ROLE_TEMPLATES } from "@/lib/role-templates";
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

// ─── Generative Team Designer ───
// Instead of picking from a fixed catalog, the orchestrator DESIGNS a team
// tailored to the specific mission. Each role is created from scratch based
// on what the brief actually needs.

function buildSystemPrompt(member: TeamMember) {
  return [
    `You are ${member.displayName}, acting as ${member.title}.`,
    `Mission remit: ${member.responsibilities.join("; ")}.`,
    SHARED_OPERATING_MANUAL,
  ].join("\n\n");
}

const AGENT_NAMES = [
  "Avery", "Morgan", "Taylor", "Jordan", "Riley",
  "Casey", "Quinn", "Alex", "Sam", "Jamie",
  "Parker", "Reese", "Skyler", "Drew", "Robin",
  "Charlie", "Dakota", "Emery", "Finley", "Harper",
];

/**
 * Analyze the brief and extract what NEEDS to be done.
 * Returns a list of "needs" — each need becomes a role.
 */
function analyzeBriefNeeds(brief: string, outputs: string, goal: string): Array<{
  need: string;
  title: string;
  purpose: string;
  skills: string[];
  deliverable: string;
  phase: number;
  workType: "planning" | "researching" | "writing" | "meeting";
}> {
  const lower = `${brief} ${outputs} ${goal}`.toLowerCase();
  const needs: Array<{
    need: string;
    title: string;
    purpose: string;
    skills: string[];
    deliverable: string;
    phase: number;
    workType: "planning" | "researching" | "writing" | "meeting";
  }> = [];

  // Always need someone to frame the mission
  needs.push({
    need: "mission-framing",
    title: "Mission Lead",
    purpose: `Frame "${goal}" into a clear execution plan with assumptions and success criteria.`,
    skills: ["brief analysis", "scoping", "risk framing"],
    deliverable: "mission-framework",
    phase: 0,
    workType: "planning",
  });

  // Parse expected outputs — each output might need a dedicated person
  const outputList = outputs.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);

  // Detect WHAT the brief is asking for and generate appropriate roles
  const detectedNeeds: Array<{ pattern: RegExp; need: () => typeof needs[0] }> = [
    // Research needs
    { pattern: /research|veille|investigation|study|evidence|data gathering/,
      need: () => ({ need: "research", title: "Research Analyst", purpose: `Gather evidence and data to support "${goal}". Compile verified sources and identify knowledge gaps.`, skills: ["research", "source validation", "synthesis"], deliverable: "research-findings", phase: 1, workType: "researching" as const }) },
    // Data/metrics
    { pattern: /data|metrics|kpi|analytics|numbers|benchmark|quantitative/,
      need: () => ({ need: "data-analysis", title: "Data Analyst", purpose: `Extract quantitative insights relevant to "${goal}". Contextualize metrics with benchmarks.`, skills: ["data analysis", "metrics interpretation", "benchmarking"], deliverable: "data-analysis", phase: 1, workType: "researching" as const }) },
    // Competition
    { pattern: /competitor|competitive|landscape|positioning|market map|differentiat/,
      need: () => ({ need: "competitive-intel", title: "Competitive Intelligence Analyst", purpose: `Map the competitive landscape and identify positioning opportunities for "${goal}".`, skills: ["competitive intelligence", "market mapping"], deliverable: "competitive-analysis", phase: 1, workType: "researching" as const }) },
    // Strategy
    { pattern: /strateg|plan|action|roadmap|priorities|direction|recommend/,
      need: () => ({ need: "strategy", title: "Strategy Advisor", purpose: `Convert research findings into actionable strategy and recommendations for "${goal}".`, skills: ["strategy", "synthesis", "prioritization"], deliverable: "strategy-document", phase: 2, workType: "writing" as const }) },
    // Content
    { pattern: /content|blog|editorial|article|copy|writing|calendar/,
      need: () => ({ need: "content", title: "Content Strategist", purpose: `Design and draft content deliverables aligned with "${goal}".`, skills: ["content strategy", "copywriting", "editorial planning"], deliverable: "content-deliverable", phase: 2, workType: "writing" as const }) },
    // Communication / PR
    { pattern: /communicat|press|pr|messaging|narrative|investor|stakeholder|memo/,
      need: () => ({ need: "communications", title: "Communications Specialist", purpose: `Craft messaging and communications materials for "${goal}".`, skills: ["messaging", "narrative design", "stakeholder communication"], deliverable: "communications-package", phase: 2, workType: "writing" as const }) },
    // Marketing
    { pattern: /marketing|campaign|promotion|go-to-market|gtm|channel|launch strategy/,
      need: () => ({ need: "marketing", title: "Marketing Strategist", purpose: `Design the marketing approach for "${goal}" — channels, timing, and messaging.`, skills: ["marketing strategy", "channel planning", "campaign design"], deliverable: "marketing-plan", phase: 2, workType: "writing" as const }) },
    // Sales
    { pattern: /sales|selling|pipeline|prospection|prospect|outbound|icp|deal/,
      need: () => ({ need: "sales", title: "Sales Strategist", purpose: `Design the sales approach for "${goal}" — ICP, outreach, and closing strategy.`, skills: ["sales strategy", "ICP definition", "pipeline design"], deliverable: "sales-playbook", phase: 2, workType: "writing" as const }) },
    // Outbound / SDR
    { pattern: /outbound|cold|sdr|sequence|email template|lead gen/,
      need: () => ({ need: "outbound", title: "Outbound Specialist", purpose: `Build prospection playbooks and outreach sequences for "${goal}".`, skills: ["outbound prospection", "cold outreach", "sequence design"], deliverable: "outbound-playbook", phase: 2, workType: "writing" as const }) },
    // Financial
    { pattern: /budget|financial|forecast|revenue|cost|pricing|investment|fiscal/,
      need: () => ({ need: "finance", title: "Financial Analyst", purpose: `Analyze the financial dimensions of "${goal}" — budgets, projections, and risk.`, skills: ["financial analysis", "budgeting", "forecasting"], deliverable: "financial-analysis", phase: 1, workType: "researching" as const }) },
    // Legal
    { pattern: /legal|compliance|gdpr|terms|contract|regulat|ip|patent/,
      need: () => ({ need: "legal", title: "Legal & Compliance Advisor", purpose: `Review legal and compliance implications of "${goal}".`, skills: ["legal review", "compliance", "contract analysis"], deliverable: "legal-review", phase: 1, workType: "researching" as const }) },
    // HR / People
    { pattern: /onboarding|culture|handbook|policy|hire|employee|team building|people/,
      need: () => ({ need: "people", title: "People & Culture Specialist", purpose: `Design people-related deliverables for "${goal}".`, skills: ["onboarding", "culture design", "policy writing"], deliverable: "people-deliverable", phase: 2, workType: "writing" as const }) },
    // Events
    { pattern: /event|conference|meetup|launch event|webinar|workshop|venue/,
      need: () => ({ need: "events", title: "Event Coordinator", purpose: `Plan and organize event logistics for "${goal}".`, skills: ["event planning", "logistics", "coordination"], deliverable: "event-plan", phase: 2, workType: "planning" as const }) },
    // Tech
    { pattern: /tech|technology|stack|architecture|infrastructure|devops|cloud|migration/,
      need: () => ({ need: "tech", title: "Technical Advisor", purpose: `Evaluate technical decisions and architecture for "${goal}".`, skills: ["architecture review", "tech evaluation", "scalability"], deliverable: "tech-assessment", phase: 1, workType: "researching" as const }) },
    // Security
    { pattern: /security|audit|vulnerability|penetration|hardening|cyber|soc2/,
      need: () => ({ need: "security", title: "Security Advisor", purpose: `Assess security posture and risks related to "${goal}".`, skills: ["security assessment", "vulnerability analysis"], deliverable: "security-audit", phase: 1, workType: "researching" as const }) },
    // Brand
    { pattern: /brand|identity|visual|logo|style guide|tone of voice/,
      need: () => ({ need: "brand", title: "Brand Strategist", purpose: `Define brand positioning and guidelines for "${goal}".`, skills: ["brand strategy", "positioning", "tone of voice"], deliverable: "brand-guidelines", phase: 2, workType: "writing" as const }) },
    // UX
    { pattern: /ux|user research|persona|journey|user experience|interview/,
      need: () => ({ need: "ux", title: "User Research Lead", purpose: `Understand user needs and behaviors relevant to "${goal}".`, skills: ["user research", "persona development", "journey mapping"], deliverable: "user-research", phase: 1, workType: "researching" as const }) },
    // SEO
    { pattern: /seo|search engine|keyword|organic|backlink|ranking/,
      need: () => ({ need: "seo", title: "SEO Specialist", purpose: `Optimize for organic discovery in "${goal}".`, skills: ["keyword research", "on-page SEO", "content optimization"], deliverable: "seo-strategy", phase: 2, workType: "writing" as const }) },
    // Social
    { pattern: /social media|social|instagram|linkedin|twitter|tiktok|community/,
      need: () => ({ need: "social", title: "Social Media Strategist", purpose: `Plan social media presence for "${goal}".`, skills: ["social media strategy", "content planning", "community management"], deliverable: "social-strategy", phase: 2, workType: "writing" as const }) },
    // Product
    { pattern: /product|feature|roadmap|pmf|product.market fit/,
      need: () => ({ need: "product", title: "Product Analyst", purpose: `Analyze product-market fit and features for "${goal}".`, skills: ["product analysis", "feature prioritization"], deliverable: "product-analysis", phase: 1, workType: "researching" as const }) },
    // Pricing
    { pattern: /pricing|price|monetization|willingness to pay|subscription|freemium/,
      need: () => ({ need: "pricing", title: "Pricing Analyst", purpose: `Analyze pricing models for "${goal}".`, skills: ["pricing strategy", "competitive pricing"], deliverable: "pricing-analysis", phase: 1, workType: "researching" as const }) },
    // Project management
    { pattern: /project|timeline|milestone|schedule|coordination|dependencies|deadline/,
      need: () => ({ need: "project-mgmt", title: "Project Coordinator", purpose: `Organize work, timelines, and dependencies for "${goal}".`, skills: ["project planning", "timeline management"], deliverable: "project-plan", phase: 2, workType: "planning" as const }) },
    // Growth
    { pattern: /growth|scale|funnel|acquisition|retention|churn/,
      need: () => ({ need: "growth", title: "Growth Advisor", purpose: `Identify growth levers and optimization opportunities for "${goal}".`, skills: ["growth strategy", "funnel optimization"], deliverable: "growth-plan", phase: 2, workType: "writing" as const }) },
    // Advisory / Board
    { pattern: /advisor|advisory|board|governance|oversight|counsel/,
      need: () => ({ need: "advisory", title: "Strategic Advisor", purpose: `Provide senior strategic oversight for "${goal}".`, skills: ["strategic advisory", "risk assessment", "governance"], deliverable: "strategic-memo", phase: 1, workType: "researching" as const }) },
    // Operations
    { pattern: /process|operations|workflow|sop|documentation|procedure/,
      need: () => ({ need: "operations", title: "Operations Designer", purpose: `Design processes and operational structures for "${goal}".`, skills: ["process design", "operations", "documentation"], deliverable: "operations-doc", phase: 2, workType: "writing" as const }) },
  ];

  // Match needs from brief
  const matched = new Set<string>();
  for (const { pattern, need } of detectedNeeds) {
    if (pattern.test(lower) && !matched.has(need().need)) {
      const n = need();
      matched.add(n.need);
      needs.push(n);
    }
  }

  // Also check if specific outputs were requested that we haven't covered
  for (const output of outputList) {
    if (output.includes("report") && !matched.has("research")) {
      needs.push({ need: "report-writer", title: "Report Writer", purpose: `Write the ${output} for "${goal}".`, skills: ["report writing", "synthesis"], deliverable: slugFromTitle(output), phase: 2, workType: "writing" });
      matched.add("report-writer");
    }
  }

  // If no specific needs detected, add research + strategy as defaults
  if (needs.length <= 1) {
    needs.push({ need: "research", title: "Research Lead", purpose: `Gather context and evidence for "${goal}".`, skills: ["research", "analysis"], deliverable: "research-brief", phase: 1, workType: "researching" });
    needs.push({ need: "strategy", title: "Strategy Lead", purpose: `Synthesize findings into actionable recommendations for "${goal}".`, skills: ["strategy", "synthesis"], deliverable: "action-plan", phase: 2, workType: "writing" });
  }

  // Always end with a reviewer
  needs.push({
    need: "review",
    title: "Quality Reviewer",
    purpose: `Review all deliverables for "${goal}" — ensure coherence, accuracy, and completeness.`,
    skills: ["editing", "quality review", "document QA"],
    deliverable: "final-deliverable",
    phase: 3,
    workType: "writing",
  });

  return needs;
}

function buildTeamProposal(input: CreateWorkspaceInput, assumptions: string[]): TeamProposal {
  const needs = analyzeBriefNeeds(input.rawBrief, input.outputExpectations, input.missionGoal);

  const roles: TeamMember[] = needs.map((need, index) => {
    const displayName = AGENT_NAMES[index % AGENT_NAMES.length];
    // Try to find a matching template for richer prompts, but the role is custom
    const closestTemplate = ROLE_TEMPLATES.find((t) =>
      need.skills.some((s) => t.skills.includes(s)),
    );
    const promptFragments = closestTemplate?.promptFragments ?? [];

    const member: TeamMember = {
      agentId: nanoid(),
      roleId: `custom-${slugFromTitle(need.need)}`,
      title: need.title,
      displayName,
      responsibilities: [
        need.purpose,
        ...promptFragments,
      ],
      rationale: `Needed for: ${need.skills.join(", ")}.`,
      systemPrompt: "",
      state: "idle",
    };

    member.systemPrompt = buildSystemPrompt(member);
    return member;
  });

  const teamSize = roles.length;
  const rationale = teamSize <= 4
    ? `A focused ${teamSize}-person team designed specifically for this mission.`
    : teamSize <= 8
      ? `A ${teamSize}-person team — each role was identified from the brief's requirements.`
      : `A ${teamSize}-person task force — the mission scope requires specialized coverage across multiple domains.`;

  const estimatedOutputs = needs
    .filter((n) => n.phase > 0 && n.phase < 3)
    .map((n) => n.deliverable.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

  const name = `${slugFromTitle(input.missionGoal || "Mission")} Crew`;
  // Cache needs so buildTaskBoard can use them without re-analyzing
  needsCache.set(name, needs);

  return { name, rationale, estimatedOutputs, roles };
}

// Store the needs analysis alongside the proposal so the task board can use it.
// This avoids re-analyzing. We attach it to a module-level cache keyed by proposal name.
const needsCache = new Map<string, ReturnType<typeof analyzeBriefNeeds>>();

function buildTaskBoard(teamProposal: TeamProposal): TaskCard[] {
  const tasks: TaskCard[] = [];
  const needs = needsCache.get(teamProposal.name) ?? [];

  // Each role maps 1:1 to a need (same order as buildTeamProposal)
  for (let i = 0; i < teamProposal.roles.length; i++) {
    const role = teamProposal.roles[i];
    const need = needs[i];
    if (!need) continue;

    const artifactId = need.deliverable;
    const isReviewer = need.phase === 3;
    const isMissionLead = need.phase === 0;

    // Dependencies: each phase depends on the previous phase
    const deps = isReviewer
      ? tasks.map((t) => t.id) // reviewer depends on everything
      : tasks.filter((_, j) => {
          const prevNeed = needs[j];
          return prevNeed && prevNeed.phase === need.phase - 1;
        }).map((t) => t.id);

    tasks.push({
      id: nanoid(),
      title: isMissionLead
        ? "Frame the mission and define success criteria"
        : isReviewer
          ? "Review all deliverables and prepare the final packet"
          : `${role.title}: ${need.purpose.split(".")[0]}`,
      ownerAgentId: role.agentId,
      status: "todo",
      description: need.purpose,
      workType: need.workType,
      acceptanceCriteria: [
        "Deliverable is complete and addresses the brief's requirements.",
        "Sources and assumptions are documented.",
      ],
      dependencies: deps,
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

function generateMockContent(title: string, type: string): string {
  switch (type) {
    case "mission-framework":
      return [
        `# ${title}`,
        "",
        "## Executive Summary",
        `This framework outlines the strategic approach for ${title.toLowerCase()}. The mission has been scoped to deliver measurable outcomes within the defined constraints.`,
        "",
        "## Objectives",
        "- Define clear success metrics and key results",
        "- Establish execution timeline with phase gates",
        "- Identify critical dependencies and resource requirements",
        "- Align stakeholders on priorities and trade-offs",
        "",
        "## Working Assumptions",
        "- The team operates with current resource constraints unless otherwise noted",
        "- First-pass outputs prioritize speed over polish",
        "- All assumptions will be validated during the research phase",
        "",
        "## Success Criteria",
        "- [ ] All deliverables address the original brief requirements",
        "- [ ] Recommendations are backed by evidence or documented reasoning",
        "- [ ] Stakeholder review completed with no blocking concerns",
      ].join("\n");

    case "research-findings":
      return [
        `# ${title}`,
        "",
        "## Key Findings",
        "- **Finding 1:** Initial landscape analysis reveals several underexplored opportunities",
        "- **Finding 2:** Existing benchmarks suggest room for improvement in core metrics",
        "- **Finding 3:** Competitive signals indicate a shifting market dynamic",
        "",
        "## Methodology",
        "- Desktop research across industry publications and databases",
        "- Analysis of publicly available competitor materials",
        "- Cross-referencing with internal data where available",
        "",
        "## Sources & References",
        "- Industry reports and white papers (to be cited inline)",
        "- Public filings and press releases",
        "- Expert commentary and analyst notes",
        "",
        "## Gaps & Open Questions",
        "- Additional primary research may be needed to validate assumptions",
        "- Certain data points require access to proprietary databases",
      ].join("\n");

    case "strategy-document":
      return [
        `# ${title}`,
        "",
        "## Recommendations",
        "1. **Short-term:** Prioritize quick wins that demonstrate momentum",
        "2. **Medium-term:** Build systematic capabilities for sustained execution",
        "3. **Long-term:** Position for market leadership through differentiation",
        "",
        "## Rationale",
        "These recommendations are grounded in the research findings and aligned with the mission objectives. Each recommendation maps to a measurable outcome.",
        "",
        "## Proposed Timeline",
        "| Phase | Duration | Focus |",
        "|-------|----------|-------|",
        "| Phase 1 | Weeks 1-2 | Foundation and quick wins |",
        "| Phase 2 | Weeks 3-6 | Core execution |",
        "| Phase 3 | Weeks 7-8 | Optimization and handoff |",
        "",
        "## Risks & Mitigations",
        "- **Resource constraints:** Mitigate with phased rollout and clear prioritization",
        "- **Market shifts:** Build in review checkpoints to adapt strategy",
        "- **Execution gaps:** Assign clear ownership for each deliverable",
      ].join("\n");

    case "competitive-analysis":
      return [
        `# ${title}`,
        "",
        "## Competitor Overview",
        "| Competitor | Positioning | Key Strength | Key Weakness |",
        "|-----------|-------------|--------------|--------------|",
        "| Competitor A | Market leader | Brand recognition | Slow to innovate |",
        "| Competitor B | Challenger | Aggressive pricing | Limited reach |",
        "| Competitor C | Niche player | Deep expertise | Narrow focus |",
        "",
        "## Strengths & Weaknesses",
        "- Most competitors focus on breadth over depth",
        "- Pricing models vary significantly across the landscape",
        "- Customer retention strategies remain underdeveloped in the segment",
        "",
        "## Opportunities",
        "- Underserved segments present clear entry points",
        "- Differentiation through superior execution and speed",
        "- Partnership potential with adjacent players",
      ].join("\n");

    case "marketing-plan":
      return [
        `# ${title}`,
        "",
        "## Channel Strategy",
        "- **Owned channels:** Website, blog, email newsletter",
        "- **Earned channels:** PR, thought leadership, community engagement",
        "- **Paid channels:** Targeted campaigns aligned with ICP",
        "",
        "## Messaging Framework",
        "- **Primary message:** Value proposition tied to the core mission objective",
        "- **Supporting proof points:** Data, testimonials, and case studies",
        "- **Tone:** Authoritative yet approachable",
        "",
        "## Timeline & Milestones",
        "- Week 1: Messaging finalized and creative assets in production",
        "- Week 2-3: Channel activation and initial outreach",
        "- Week 4+: Performance review and optimization cycle",
        "",
        "## Budget Considerations",
        "- Allocate majority of spend to highest-ROI channels",
        "- Reserve budget for experimentation and iteration",
        "- Track CAC and attribution across all touchpoints",
      ].join("\n");

    case "sales-playbook":
      return [
        `# ${title}`,
        "",
        "## Ideal Customer Profile (ICP)",
        "- **Industry:** Target verticals with highest propensity to convert",
        "- **Company size:** Mid-market to enterprise (50-500 employees)",
        "- **Decision maker:** VP-level or above with budget authority",
        "- **Pain points:** Operational inefficiency, competitive pressure, growth targets",
        "",
        "## Outreach Approach",
        "- Multi-touch sequence combining email, LinkedIn, and phone",
        "- Personalized messaging based on prospect research",
        "- Value-first positioning with clear call to action",
        "",
        "## Objection Handling",
        "- **\"Too expensive\":** Reframe around ROI and total cost of inaction",
        "- **\"Not a priority\":** Connect to their stated business objectives",
        "- **\"Already have a solution\":** Differentiate on specific capability gaps",
      ].join("\n");

    case "financial-analysis":
      return [
        `# ${title}`,
        "",
        "## Key Metrics",
        "| Metric | Current | Target | Gap |",
        "|--------|---------|--------|-----|",
        "| Revenue | TBD | TBD | — |",
        "| Margin | TBD | TBD | — |",
        "| Burn rate | TBD | TBD | — |",
        "",
        "## Projections",
        "- **Base case:** Conservative assumptions with current trajectory",
        "- **Upside case:** Accelerated growth with successful execution",
        "- **Downside case:** Risk scenario with mitigation measures",
        "",
        "## Financial Risks",
        "- Revenue concentration in a single channel or customer segment",
        "- Cost escalation without corresponding growth in returns",
        "- Currency or market volatility exposure",
      ].join("\n");

    default:
      return [
        `# ${title}`,
        "",
        "## Overview",
        `This document covers the key aspects of ${title.toLowerCase()}. The analysis is structured to provide actionable insights and clear next steps.`,
        "",
        "## Key Points",
        "- Initial assessment indicates several areas of opportunity",
        "- Current state analysis reveals both strengths and gaps",
        "- Stakeholder alignment is critical for successful execution",
        "- Resource allocation should follow priority ranking",
        "",
        "## Analysis",
        "The following sections will be populated as the team completes their research and synthesis phases. Each section maps to a specific task in the execution plan.",
        "",
        "## Next Steps",
        "1. Validate assumptions with available data",
        "2. Incorporate feedback from the review cycle",
        "3. Finalize recommendations and delivery timeline",
      ].join("\n");
  }
}

function firstArtifact(title: string, type: string, taskId: string): ArtifactRecord {
  const content = generateMockContent(title, type);
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
        content,
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
