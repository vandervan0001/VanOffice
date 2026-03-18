import { describe, expect, it } from "vitest";

import { projectWorkspaceState } from "@/lib/runtime/projector";
import type { RunEvent, WorkspaceRecord } from "@/lib/types";

const workspace: WorkspaceRecord = {
  id: "workspace-1",
  title: "Marketing sprint",
  providerId: "mock",
  status: "awaiting_team_approval",
  createdAt: 1,
  updatedAt: 1,
};

describe("projectWorkspaceState", () => {
  it("reconstructs approvals and task progress from events", () => {
    const events: RunEvent[] = [
      {
        id: "1",
        workspaceId: workspace.id,
        sequence: 1,
        type: "team.proposed",
        createdAt: 10,
        payload: {
          teamProposal: {
            name: "Team",
            rationale: "Lean squad",
            estimatedOutputs: [],
            roles: [
              {
                agentId: "agent-1",
                roleId: "mission-planner",
                title: "Mission Planner",
                displayName: "Avery",
                responsibilities: ["Scope"],
                rationale: "Needed",
                systemPrompt: "prompt",
                state: "idle",
              },
            ],
          },
        },
      },
      {
        id: "2",
        workspaceId: workspace.id,
        sequence: 2,
        type: "approval.requested",
        createdAt: 20,
        payload: {
          gateType: "team_proposal",
          message: "Approve team",
        },
      },
      {
        id: "3",
        workspaceId: workspace.id,
        sequence: 3,
        type: "task.board.created",
        createdAt: 30,
        payload: {
          tasks: [
            {
              id: "task-1",
              title: "Plan",
              ownerAgentId: "agent-1",
              status: "todo",
              description: "desc",
              workType: "planning",
              acceptanceCriteria: ["done"],
              dependencies: [],
              linkedArtifactIds: [],
            },
          ],
        },
      },
      {
        id: "4",
        workspaceId: workspace.id,
        sequence: 4,
        type: "task.started",
        createdAt: 40,
        payload: {
          taskId: "task-1",
          agentId: "agent-1",
          state: "planning",
        },
      },
      {
        id: "5",
        workspaceId: workspace.id,
        sequence: 5,
        type: "task.completed",
        createdAt: 50,
        payload: {
          taskId: "task-1",
          agentId: "agent-1",
        },
      },
    ];

    const snapshot = projectWorkspaceState(workspace, events);

    expect(snapshot.approvals[0]?.gateType).toBe("team_proposal");
    expect(snapshot.tasks[0]?.status).toBe("done");
    expect(snapshot.agents[0]?.state).toBe("done");
  });
});
