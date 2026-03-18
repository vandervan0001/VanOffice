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

function deriveRoleIds(brief: string) {
  const roleIds = new Set<string>([
    "mission-planner",
    "research-lead",
    "strategy-lead",
    "editor-reviewer",
  ]);
  const lower = brief.toLowerCase();

  if (lower.includes("design") || lower.includes("brand")) {
    roleIds.add("strategy-lead");
  }

  if (lower.includes("research") || lower.includes("veille")) {
    roleIds.add("research-lead");
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

function buildTeamProposal(input: CreateWorkspaceInput, assumptions: string[]): TeamProposal {
  const roleIds = deriveRoleIds(input.rawBrief);

  const roles = roleIds
    .map((roleId) => getRoleTemplate(roleId))
    .filter((template): template is NonNullable<typeof template> => Boolean(template))
    .map((template, index) => {
      const displayName = ["Avery", "Morgan", "Taylor", "Jordan", "Riley"][index] ?? `Agent ${index + 1}`;
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

  return {
    name: `${slugFromTitle(input.missionGoal || "Mission")} Crew`,
    rationale:
      "A lean cross-functional squad is enough for the first pass: one planner, one researcher, one strategist, one reviewer.",
    estimatedOutputs: [
      "Mission summary",
      "Research brief",
      "Action plan",
      "Final team packet",
    ],
    roles,
  };
}

function buildTaskBoard(teamProposal: TeamProposal): TaskCard[] {
  const planner = teamProposal.roles.find((role) => role.roleId === "mission-planner");
  const researcher = teamProposal.roles.find((role) => role.roleId === "research-lead");
  const strategist = teamProposal.roles.find((role) => role.roleId === "strategy-lead");
  const reviewer = teamProposal.roles.find((role) => role.roleId === "editor-reviewer");

  const tasks: TaskCard[] = [];

  if (planner) {
    tasks.push({
      id: nanoid(),
      title: "Frame the mission and sharpen the operating assumptions",
      ownerAgentId: planner.agentId,
      status: "todo",
      description: "Produce a concise mission framing note before the team branches out.",
      workType: "planning",
      acceptanceCriteria: [
        "The mission summary is explicit.",
        "Top assumptions are visible to the full team.",
      ],
      dependencies: [],
      linkedArtifactIds: ["mission-summary"],
    });
  }

  if (researcher) {
    tasks.push({
      id: nanoid(),
      title: "Compile market and evidence signals",
      ownerAgentId: researcher.agentId,
      status: "todo",
      description: "Gather citable signals from the brief and light web research.",
      workType: "researching",
      acceptanceCriteria: [
        "Key facts or external references are summarized.",
        "Confidence gaps are noted.",
      ],
      dependencies: tasks[0] ? [tasks[0].id] : [],
      linkedArtifactIds: ["research-brief"],
    });
  }

  if (strategist) {
    tasks.push({
      id: nanoid(),
      title: "Turn findings into an action plan",
      ownerAgentId: strategist.agentId,
      status: "todo",
      description: "Synthesize the evidence into concrete next steps and recommendations.",
      workType: "writing",
      acceptanceCriteria: [
        "Recommendations are ordered by impact.",
        "Every recommendation has a rationale.",
      ],
      dependencies: tasks.filter((task) => task.workType === "researching").map((task) => task.id),
      linkedArtifactIds: ["action-plan"],
    });
  }

  if (reviewer) {
    tasks.push({
      id: nanoid(),
      title: "Review the packet and prepare final deliverables",
      ownerAgentId: reviewer.agentId,
      status: "todo",
      description: "Edit the artifacts into a clean final packet with explicit review notes.",
      workType: "writing",
      acceptanceCriteria: [
        "Artifacts are coherent and versioned.",
        "Final packet is ready for approval.",
      ],
      dependencies: tasks.map((task) => task.id),
      linkedArtifactIds: ["final-deliverable"],
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
        await appendEvent(workspaceId, "artifact.updated", {
          artifact: firstArtifact(
            task.linkedArtifactIds[0] === "mission-summary"
              ? "Mission Summary"
              : task.linkedArtifactIds[0] === "research-brief"
                ? "Research Brief"
                : task.linkedArtifactIds[0] === "action-plan"
                  ? "Action Plan"
                  : "Final Team Packet",
            task.linkedArtifactIds[0],
            task.id,
          ),
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
