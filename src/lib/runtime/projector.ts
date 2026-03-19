import type {
  ApprovalGate,
  ArtifactRecord,
  MissionBrief,
  RunEvent,
  RunEventPayloadMap,
  TeamMember,
  TeamProposal,
  TaskCard,
  WorkspaceRecord,
  WorkspaceSnapshot,
} from "@/lib/types";

function setAgentState(
  agents: TeamMember[],
  agentId: string,
  state: TeamMember["state"],
) {
  const agent = agents.find((candidate) => candidate.agentId === agentId);

  if (agent) {
    agent.state = state;
  }
}

function upsertArtifact(artifacts: ArtifactRecord[], artifact: ArtifactRecord) {
  const index = artifacts.findIndex((candidate) => candidate.id === artifact.id);

  if (index === -1) {
    artifacts.push(artifact);
    return;
  }

  artifacts[index] = artifact;
}

function upsertApproval(approvals: ApprovalGate[], nextGate: ApprovalGate) {
  const index = approvals.findIndex(
    (candidate) => candidate.gateType === nextGate.gateType,
  );

  if (index === -1) {
    approvals.push(nextGate);
    return;
  }

  approvals[index] = nextGate;
}

export function projectWorkspaceState(
  workspace: WorkspaceRecord,
  events: RunEvent[],
  uptoSequence = Number.POSITIVE_INFINITY,
): WorkspaceSnapshot {
  const snapshot: WorkspaceSnapshot = {
    workspace,
    assumptions: [],
    expectedOutputs: [],
    tasks: [],
    artifacts: [],
    approvals: [],
    agents: [],
    runStatus: workspace.status,
    events: events.filter((event) => event.sequence <= uptoSequence),
  };

  for (const event of snapshot.events) {
    switch (event.type) {
      case "brief.ingested":
        snapshot.brief = event.payload as MissionBrief;
        break;
      case "brief.parsed":
        snapshot.summary = (
          event.payload as {
            summary: string;
            assumptions: string[];
            recommendedOutputs: string[];
          }
        ).summary;
        snapshot.assumptions = (
          event.payload as {
            summary: string;
            assumptions: string[];
            recommendedOutputs: string[];
          }
        ).assumptions;
        snapshot.expectedOutputs = (
          event.payload as {
            summary: string;
            assumptions: string[];
            recommendedOutputs: string[];
          }
        ).recommendedOutputs;
        break;
      case "team.proposed":
        snapshot.teamProposal = (event.payload as { teamProposal: TeamProposal }).teamProposal;
        snapshot.agents = snapshot.teamProposal.roles.map((member) => ({
          ...member,
          state: "idle",
        }));
        break;
      case "approval.requested":
        {
          const payload = event.payload as {
            gateType: ApprovalGate["gateType"];
            message: string;
          };
        upsertApproval(snapshot.approvals, {
          gateType: payload.gateType,
          status: "pending",
          message: payload.message,
          requestedAt: event.createdAt,
        });
        if (payload.gateType === "team_proposal") {
          snapshot.runStatus = "awaiting_team_approval";
        } else if (payload.gateType === "execution_plan") {
          snapshot.runStatus = "awaiting_plan_approval";
        } else if (payload.gateType === "final_deliverables") {
          snapshot.runStatus = "awaiting_final_approval";
          snapshot.agents = snapshot.agents.map((agent) => ({
            ...agent,
            state: agent.state === "done" ? "done" : "waiting_for_approval",
          }));
        }
        break;
      }
      case "approval.resolved": {
        const payload = event.payload as {
          gateType: ApprovalGate["gateType"];
        };
        const current = snapshot.approvals.find(
          (gate) => gate.gateType === payload.gateType,
        );
        upsertApproval(snapshot.approvals, {
          gateType: payload.gateType,
          status: "approved",
          message: current?.message ?? "Approved",
          requestedAt: current?.requestedAt ?? event.createdAt,
          resolvedAt: event.createdAt,
        });
        break;
      }
      case "task.board.created":
        snapshot.tasks = (event.payload as { tasks: TaskCard[] }).tasks;
        break;
      case "run.started":
        snapshot.runStatus = "running";
        snapshot.agents = snapshot.agents.map((agent) => ({
          ...agent,
          state: "planning",
        }));
        break;
      case "meeting.started": {
        const payload = event.payload as {
          meetingId: string;
          title: string;
          participantAgentIds: string[];
        };
        snapshot.activeMeeting = {
          meetingId: payload.meetingId,
          title: payload.title,
          participantAgentIds: payload.participantAgentIds,
        };
        for (const participantId of payload.participantAgentIds) {
          setAgentState(snapshot.agents, participantId, "meeting");
        }
        break;
      }
      case "meeting.ended": {
        const payload = event.payload as {
          meetingId: string;
        };
        if (snapshot.activeMeeting?.meetingId === payload.meetingId) {
          snapshot.activeMeeting = undefined;
        }
        snapshot.agents = snapshot.agents.map((agent) => ({
          ...agent,
          state: agent.state === "meeting" ? "idle" : agent.state,
        }));
        break;
      }
      case "task.started": {
        const payload = event.payload as {
          taskId: string;
          agentId: string;
          state: TeamMember["state"];
        };
        const task = snapshot.tasks.find(
          (candidate) => candidate.id === payload.taskId,
        );
        if (task) {
          task.status = "in_progress";
        }
        setAgentState(snapshot.agents, payload.agentId, payload.state);
        break;
      }
      case "task.completed": {
        const payload = event.payload as {
          taskId: string;
          agentId: string;
        };
        const task = snapshot.tasks.find(
          (candidate) => candidate.id === payload.taskId,
        );
        if (task) {
          task.status = "done";
        }
        setAgentState(snapshot.agents, payload.agentId, "done");
        break;
      }
      case "artifact.updated":
        upsertArtifact(
          snapshot.artifacts,
          (event.payload as { artifact: ArtifactRecord }).artifact,
        );
        break;
      case "run.completed":
        snapshot.runStatus = "complete";
        snapshot.agents = snapshot.agents.map((agent) => ({
          ...agent,
          state: "done",
        }));
        break;
      case "agent.created": {
        const ac = event.payload as RunEventPayloadMap["agent.created"];
        snapshot.agents.push({
          agentId: ac.agentId,
          displayName: ac.displayName,
          title: ac.title,
          roleId: ac.roleTemplateId ?? "custom",
          responsibilities: [ac.responsibilities],
          rationale: "Hired via chat command",
          systemPrompt: "",
          state: "idle",
        });
        break;
      }
      case "task.created": {
        const tc = event.payload as RunEventPayloadMap["task.created"];
        snapshot.tasks.push({
          id: tc.taskId,
          title: tc.title,
          ownerAgentId: tc.ownerAgentId,
          description: tc.title,
          dependencies: [],
          status: "todo",
          acceptanceCriteria: [],
          linkedArtifactIds: tc.artifactId ? [tc.artifactId] : [],
          workType: "writing",
        });
        break;
      }
      default:
        break;
    }
  }

  return snapshot;
}
