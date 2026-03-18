import { describe, expect, it } from "vitest";

import { deriveAgentPlacements } from "@/lib/state/office";
import type { WorkspaceSnapshot } from "@/lib/types";

describe("deriveAgentPlacements", () => {
  it("maps each agent to a visible room based on its state", () => {
    const snapshot = {
      workspace: {
        id: "w-1",
        title: "Workspace",
        providerId: "mock",
        status: "running",
        createdAt: 1,
        updatedAt: 1,
      },
      assumptions: [],
      expectedOutputs: [],
      tasks: [],
      artifacts: [],
      approvals: [],
      teamProposal: undefined,
      activeMeeting: undefined,
      runStatus: "running",
      events: [],
      agents: [
        {
          agentId: "a",
          roleId: "research-lead",
          title: "Research Lead",
          displayName: "Morgan",
          responsibilities: [],
          rationale: "",
          systemPrompt: "",
          state: "researching",
        },
      ],
    } satisfies WorkspaceSnapshot;

    const placements = deriveAgentPlacements(snapshot);

    expect(placements).toHaveLength(1);
    expect(placements[0]?.x).toBeGreaterThan(250);
    expect(placements[0]?.state).toBe("researching");
  });
});
