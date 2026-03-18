import { describe, expect, it } from "vitest";

import { projectWorkspaceState } from "@/lib/runtime/projector";
import type { RunEvent, WorkspaceRecord } from "@/lib/types";

describe("artifact provenance", () => {
  it("keeps source task lineage on updated artifacts", () => {
    const workspace: WorkspaceRecord = {
      id: "workspace-artifact",
      title: "Workspace",
      providerId: "mock",
      status: "running",
      createdAt: 1,
      updatedAt: 1,
    };

    const events: RunEvent[] = [
      {
        id: "artifact-1",
        workspaceId: workspace.id,
        sequence: 1,
        type: "artifact.updated",
        createdAt: 10,
        payload: {
          artifact: {
            id: "report",
            title: "Report",
            type: "final-report",
            status: "needs_review",
            schema: "markdown-v1",
            provenance: ["task-1", "task-2"],
            currentVersion: 1,
            versions: [
              {
                version: 1,
                createdAt: 10,
                content: "# Report",
                notes: "Initial draft",
                sourceTaskIds: ["task-1", "task-2"],
                citations: ["https://example.com"],
              },
            ],
          },
        },
      },
    ];

    const snapshot = projectWorkspaceState(workspace, events);

    expect(snapshot.artifacts[0]?.provenance).toEqual(["task-1", "task-2"]);
    expect(snapshot.artifacts[0]?.versions[0]?.citations).toContain(
      "https://example.com",
    );
  });
});
