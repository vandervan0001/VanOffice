import { nanoid } from "nanoid";

import { appendEvent, getWorkspaceRecord, listWorkspaceEvents, setWorkspaceStatus } from "@/lib/db/client";
import { projectWorkspaceState } from "@/lib/runtime/projector";
import type {
  ArtifactRecord,
  RunEvent,
  TaskCard,
} from "@/lib/types";

const activeSchedules = new Map<string, ReturnType<typeof setTimeout>[]>();

function artifactFromTask(task: TaskCard, index: number): ArtifactRecord {
  const artifactId = task.linkedArtifactIds[0] ?? nanoid();
  const isResearch = task.workType === "researching";
  const title = isResearch ? "Research Brief" : index === 1 ? "Action Plan" : "Final Narrative";
  const content = isResearch
    ? `# ${title}\n\n## Focus\n${task.title}\n\n## Signals\n- Target audience summary\n- Competitive patterns\n- Market constraints\n`
    : `# ${title}\n\n## Objective\n${task.description}\n\n## Next Steps\n1. Tighten the positioning.\n2. Sequence the campaign.\n3. Define measurable checkpoints.\n`;

  return {
    id: artifactId,
    title,
    type: isResearch ? "research-brief" : "action-plan",
    status: index === 2 ? "needs_review" : "draft",
    schema: "markdown-v1",
    provenance: [task.id],
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: Date.now(),
        content,
        notes: isResearch ? "First evidence pack." : "First synthesis draft.",
        sourceTaskIds: [task.id],
        citations: [],
      },
    ],
  };
}

function buildExecutionTimeline(snapshot: ReturnType<typeof projectWorkspaceState>) {
  const events: Array<{
    delayMs: number;
    event: Omit<RunEvent, "id" | "workspaceId" | "sequence" | "createdAt">;
  }> = [];
  let delayMs = 200;

  events.push({
    delayMs,
    event: {
      type: "run.started",
      payload: { startedBy: "system" },
    },
  });

  delayMs += 800;
  const kickoffMeetingId = nanoid();
  events.push({
    delayMs,
    event: {
      type: "meeting.started",
      payload: {
        meetingId: kickoffMeetingId,
        title: "Kickoff alignment",
        participantAgentIds: snapshot.agents.map((agent) => agent.agentId),
      },
    },
  });

  delayMs += 1200;
  events.push({
    delayMs,
    event: {
      type: "meeting.ended",
      payload: { meetingId: kickoffMeetingId },
    },
  });

  snapshot.tasks.forEach((task, index) => {
    delayMs += 700;
    events.push({
      delayMs,
      event: {
        type: "task.started",
        payload: {
          taskId: task.id,
          agentId: task.ownerAgentId,
          state: task.workType,
        },
      },
    });

    delayMs += 1100;
    events.push({
      delayMs,
      event: {
        type: "artifact.updated",
        payload: {
          artifact: artifactFromTask(task, index),
        },
      },
    });

    delayMs += 700;
    events.push({
      delayMs,
      event: {
        type: "task.completed",
        payload: {
          taskId: task.id,
          agentId: task.ownerAgentId,
        },
      },
    });
  });

  delayMs += 1000;
  const reviewMeetingId = nanoid();
  events.push({
    delayMs,
    event: {
      type: "meeting.started",
      payload: {
        meetingId: reviewMeetingId,
        title: "Review sync",
        participantAgentIds: snapshot.agents.map((agent) => agent.agentId),
      },
    },
  });

  delayMs += 1200;
  events.push({
    delayMs,
    event: {
      type: "artifact.updated",
      payload: {
        artifact: {
          id: "final-deliverable",
          title: "Final Team Packet",
          type: "final-report",
          status: "needs_review",
          schema: "markdown-v1",
          provenance: snapshot.tasks.map((task) => task.id),
          currentVersion: 1,
          versions: [
            {
              version: 1,
              createdAt: Date.now(),
              content: [
                "# Final Team Packet",
                "",
                "## Mission Summary",
                snapshot.summary ?? "No summary generated.",
                "",
                "## Assumptions",
                ...snapshot.assumptions.map((assumption) => `- ${assumption}`),
                "",
                "## Recommended Outputs",
                ...snapshot.expectedOutputs.map((output) => `- ${output}`),
              ].join("\n"),
              notes: "Combined review draft assembled by the reviewer.",
              sourceTaskIds: snapshot.tasks.map((task) => task.id),
              citations: [],
            },
          ],
        },
      },
    },
  });

  delayMs += 800;
  events.push({
    delayMs,
    event: {
      type: "meeting.ended",
      payload: { meetingId: reviewMeetingId },
    },
  });

  delayMs += 500;
  events.push({
    delayMs,
    event: {
      type: "approval.requested",
      payload: {
        gateType: "final_deliverables",
        message: "Review and approve the deliverables before marking the run complete.",
      },
    },
  });

  return events;
}

export async function scheduleWorkspaceExecution(workspaceId: string) {
  if (activeSchedules.has(workspaceId)) {
    return;
  }

  const workspace = await getWorkspaceRecord(workspaceId);
  if (!workspace) {
    return;
  }

  const events = await listWorkspaceEvents(workspaceId);
  const snapshot = projectWorkspaceState(workspace, events);
  const timeline = buildExecutionTimeline(snapshot);
  const timers: ReturnType<typeof setTimeout>[] = [];

  await setWorkspaceStatus(workspaceId, "running");

  timeline.forEach((entry) => {
    const timer = setTimeout(async () => {
      await appendEvent(workspaceId, entry.event.type, entry.event.payload as never);
      if (entry.event.type === "approval.requested") {
        await setWorkspaceStatus(workspaceId, "awaiting_final_approval");
        activeSchedules.delete(workspaceId);
      }
    }, entry.delayMs);

    timers.push(timer);
  });

  activeSchedules.set(workspaceId, timers);
}

export function clearWorkspaceSchedule(workspaceId: string) {
  const timers = activeSchedules.get(workspaceId);
  if (!timers) {
    return;
  }

  for (const timer of timers) {
    clearTimeout(timer);
  }

  activeSchedules.delete(workspaceId);
}
