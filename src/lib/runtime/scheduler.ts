import { nanoid } from "nanoid";

import { appendEvent, getWorkspaceRecord, listWorkspaceEvents, setWorkspaceStatus } from "@/lib/db/client";
import { getProviderAdapter } from "@/lib/runtime/adapters/providers";
import { projectWorkspaceState } from "@/lib/runtime/projector";
import type {
  ArtifactRecord,
  RunEvent,
  TaskCard,
  TeamMember,
} from "@/lib/types";

const activeSchedules = new Map<string, ReturnType<typeof setTimeout>[]>();

/**
 * Generate artifact content using the real LLM provider.
 * Falls back to mock content if the provider call fails.
 */
async function generateArtifactContent(
  providerId: string,
  task: TaskCard,
  agent: TeamMember | undefined,
  missionGoal: string,
  missionBrief: string,
): Promise<string> {
  const provider = getProviderAdapter(providerId);

  // Skip LLM call for mock provider
  if (providerId === "mock" || !provider.isConfigured()) {
    return "";
  }

  try {
    const system = agent?.systemPrompt ?? "You are a professional analyst.";
    const prompt = [
      `Mission: ${missionGoal}`,
      "",
      `Your task: ${task.title}`,
      `Description: ${task.description}`,
      "",
      `Acceptance criteria:`,
      ...task.acceptanceCriteria.map((c) => `- ${c}`),
      "",
      `Brief context (abbreviated):`,
      missionBrief.slice(0, 1000),
      "",
      "Produce a structured markdown deliverable for this task. Use clear headings (##), bullet points, and tables where appropriate. Be specific and actionable. Keep it under 500 words.",
    ].join("\n");

    const result = await provider.complete({ system, prompt });
    return result.text;
  } catch (err) {
    console.error(`[scheduler] LLM call failed for task "${task.title}":`, err);
    return "";
  }
}

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
  const providerId = workspace.providerId;
  const isRealProvider = providerId !== "mock" && getProviderAdapter(providerId).isConfigured();

  await setWorkspaceStatus(workspaceId, "running");

  if (isRealProvider) {
    // Real LLM execution — run tasks sequentially with actual API calls
    scheduleRealExecution(workspaceId, snapshot, providerId);
  } else {
    // Mock execution — use pre-built timeline with fixed delays
    const timeline = buildExecutionTimeline(snapshot);
    const timers: ReturnType<typeof setTimeout>[] = [];

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
}

/**
 * Execute tasks sequentially with real LLM calls.
 * Each task gets a real API call to generate deliverable content.
 */
async function scheduleRealExecution(
  workspaceId: string,
  snapshot: ReturnType<typeof projectWorkspaceState>,
  providerId: string,
) {
  // Use a single timer ref so clearWorkspaceSchedule can cancel
  const cancelRef = { cancelled: false };
  const timer = setTimeout(() => {}, 0); // placeholder
  activeSchedules.set(workspaceId, [timer]);

  try {
    // Kickoff meeting
    await appendEvent(workspaceId, "run.started", { startedBy: "system" });

    const kickoffId = nanoid();
    await appendEvent(workspaceId, "meeting.started", {
      meetingId: kickoffId,
      title: "Kickoff alignment",
      participantAgentIds: snapshot.agents.map((a) => a.agentId),
    });

    await delay(2000);
    if (cancelRef.cancelled) return;

    await appendEvent(workspaceId, "meeting.ended", { meetingId: kickoffId });

    // Execute each task with real LLM
    const missionGoal = snapshot.workspace.title;
    const missionBrief = snapshot.summary ?? "";

    for (let i = 0; i < snapshot.tasks.length; i++) {
      if (cancelRef.cancelled) return;

      const task = snapshot.tasks[i];
      const agent = snapshot.agents.find((a) => a.agentId === task.ownerAgentId);

      // Task started
      await appendEvent(workspaceId, "task.started", {
        taskId: task.id,
        agentId: task.ownerAgentId,
        state: task.workType,
      });

      await delay(500);
      if (cancelRef.cancelled) return;

      // Generate real content via LLM
      console.log(`[scheduler] Calling ${providerId} for task: ${task.title}`);
      const content = await generateArtifactContent(
        providerId, task, agent, missionGoal, missionBrief,
      );

      const artifactId = task.linkedArtifactIds[0] ?? task.id;
      const title = artifactId
        .replace(/-output$/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Use LLM content or fall back to mock
      const finalContent = content || artifactFromTask(task, i).versions[0].content;

      await appendEvent(workspaceId, "artifact.updated", {
        artifact: {
          id: artifactId,
          title,
          type: artifactId,
          status: i === snapshot.tasks.length - 1 ? "needs_review" as const : "draft" as const,
          schema: "markdown-v1",
          provenance: [task.id],
          currentVersion: 1,
          versions: [{
            version: 1,
            createdAt: Date.now(),
            content: finalContent,
            notes: content ? `Generated by ${providerId}` : "Mock content (LLM call failed)",
            sourceTaskIds: [task.id],
            citations: [],
          }],
        },
      });

      await delay(300);
      if (cancelRef.cancelled) return;

      // Task completed
      await appendEvent(workspaceId, "task.completed", {
        taskId: task.id,
        agentId: task.ownerAgentId,
      });

      await delay(500);
    }

    if (cancelRef.cancelled) return;

    // Review meeting
    const reviewId = nanoid();
    await appendEvent(workspaceId, "meeting.started", {
      meetingId: reviewId,
      title: "Review sync",
      participantAgentIds: snapshot.agents.map((a) => a.agentId),
    });

    await delay(2000);
    if (cancelRef.cancelled) return;

    // Final deliverable — compile all artifacts
    await appendEvent(workspaceId, "artifact.updated", {
      artifact: {
        id: "final-deliverable",
        title: "Final Team Packet",
        type: "final-report",
        status: "needs_review" as const,
        schema: "markdown-v1",
        provenance: snapshot.tasks.map((t) => t.id),
        currentVersion: 1,
        versions: [{
          version: 1,
          createdAt: Date.now(),
          content: [
            "# Final Team Packet",
            "",
            `## Mission: ${missionGoal}`,
            "",
            snapshot.summary ?? "",
            "",
            "## Deliverables compiled by the review team.",
            "",
            "*Click individual artifact cards below to read each deliverable in full.*",
          ].join("\n"),
          notes: "Compiled review packet.",
          sourceTaskIds: snapshot.tasks.map((t) => t.id),
          citations: [],
        }],
      },
    });

    await appendEvent(workspaceId, "meeting.ended", { meetingId: reviewId });

    await delay(500);

    // Request final approval
    await appendEvent(workspaceId, "approval.requested", {
      gateType: "final_deliverables",
      message: "Review and approve the deliverables before marking the run complete.",
    });
    await setWorkspaceStatus(workspaceId, "awaiting_final_approval");

  } catch (err) {
    console.error("[scheduler] Real execution failed:", err);
    // Fall back to completing with error note
    await appendEvent(workspaceId, "approval.requested", {
      gateType: "final_deliverables",
      message: `Execution encountered errors. Some deliverables may be incomplete. Error: ${err instanceof Error ? err.message : "Unknown"}`,
    });
    await setWorkspaceStatus(workspaceId, "awaiting_final_approval");
  } finally {
    activeSchedules.delete(workspaceId);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
