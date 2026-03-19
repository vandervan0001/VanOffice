import { NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent, getWorkspaceRecord } from "@/lib/db/client";
import { getWorkspaceSnapshot } from "@/lib/runtime/engine";
import { getProviderAdapter } from "@/lib/runtime/adapters/providers";
import { generateArtifactContent } from "@/lib/runtime/scheduler";
import type { WorkspaceSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().min(1),
  source: z.enum(["user", "system"]).default("user"),
});

/* ------------------------------------------------------------------ */
/*  Action definitions the coordinator can trigger                     */
/* ------------------------------------------------------------------ */

interface CoordinatorAction {
  action: "run_agent" | "revise_deliverable" | "add_agent" | "none";
  agentName?: string;
  artifactTitle?: string;
  feedback?: string;
  newAgentTitle?: string;
  newAgentPurpose?: string;
  explanation: string;
}

function buildCoordinatorPrompt(
  snapshot: WorkspaceSnapshot,
  userMessage: string,
): string {
  const agentSummary = snapshot.agents
    .map((a) => `- ${a.displayName} (${a.title}): ${a.state}`)
    .join("\n");
  const artifactSummary = snapshot.artifacts
    .map(
      (a) =>
        `- "${a.title}": ${a.status} (v${a.currentVersion}) — ${a.versions[a.versions.length - 1]?.content?.slice(0, 100) ?? "empty"}...`,
    )
    .join("\n");

  return [
    "You are the team coordinator. You manage a team of AI agents who produce deliverables.",
    "",
    `Mission: ${snapshot.workspace.title}`,
    `Brief: ${snapshot.summary ?? "No summary available."}`,
    "",
    "Current team:",
    agentSummary || "(no agents)",
    "",
    "Current deliverables:",
    artifactSummary || "(no deliverables yet)",
    "",
    "You can take ONE of these actions:",
    '1. run_agent — Run an agent to produce a NEW deliverable. Use agentName matching one of the team members above. Set artifactTitle to a short name for the output (e.g. "SWOT Analysis", "Competitor Pricing Report"). Include detailed instructions in feedback.',
    '2. revise_deliverable — Revise an existing deliverable with specific feedback. Use artifactTitle matching one of the deliverables above.',
    '3. add_agent — Create a new agent with a specific role. Specify newAgentTitle (e.g. "SEO Specialist") and newAgentPurpose.',
    "4. none — Just respond with information, no action needed.",
    "",
    "IMPORTANT RULES:",
    "- Be proactive and creative. If the user gives a vague instruction, make decisions and act.",
    "- If the user asks for something and you need context they didn't provide, INVENT realistic context and proceed. Don't ask for more info.",
    '- If the user says "draft a SWOT" or similar, pick the best agent and run them with specific instructions.',
    "- Always respond with valid JSON.",
    "",
    "Respond with ONLY a JSON object like:",
    '{ "action": "run_agent", "agentName": "Morgan", "artifactTitle": "SWOT Analysis", "feedback": "Draft a detailed SWOT analysis for a B2B SaaS product targeting European SMBs. Invent realistic product details.", "explanation": "I\'ll have Morgan draft the SWOT analysis right away." }',
    "",
    "or for no action:",
    '{ "action": "none", "explanation": "Here is a summary of..." }',
    "",
    `User instruction: "${userMessage}"`,
  ].join("\n");
}

function parseCoordinatorResponse(text: string): CoordinatorAction {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        action: parsed.action ?? "none",
        agentName: parsed.agentName,
        artifactTitle: parsed.artifactTitle,
        feedback: parsed.feedback,
        newAgentTitle: parsed.newAgentTitle,
        newAgentPurpose: parsed.newAgentPurpose,
        explanation: parsed.explanation ?? text,
      };
    } catch {
      // JSON parse failed, fall through
    }
  }
  return { action: "none", explanation: text };
}

async function executeAction(
  workspaceId: string,
  action: CoordinatorAction,
  snapshot: WorkspaceSnapshot,
  providerId: string,
): Promise<string> {
  const provider = getProviderAdapter(providerId);
  const isReal = providerId !== "mock" && provider.isConfigured();

  switch (action.action) {
    case "run_agent": {
      const agent = snapshot.agents.find(
        (a) =>
          a.displayName.toLowerCase() === action.agentName?.toLowerCase() ||
          a.title.toLowerCase().includes(action.agentName?.toLowerCase() ?? ""),
      );
      if (!agent) {
        return `Could not find agent "${action.agentName}". Available: ${snapshot.agents.map((a) => a.displayName).join(", ")}`;
      }

      // Find the task linked to this agent
      const task = snapshot.tasks.find((t) => t.ownerAgentId === agent.agentId);
      if (!task) {
        return `No task found for agent ${agent.displayName}.`;
      }

      // Mark task as started
      await appendEvent(workspaceId, "task.started", {
        taskId: task.id,
        agentId: agent.agentId,
        state: task.workType,
      });

      // Generate content
      let content = "";
      if (isReal) {
        const customTask = {
          ...task,
          description: action.feedback
            ? `${task.description}\n\nSPECIFIC INSTRUCTION FROM MANAGER: ${action.feedback}`
            : task.description,
        };
        content = await generateArtifactContent(
          providerId,
          customTask,
          agent,
          snapshot.workspace.title,
          snapshot.summary ?? "",
        );
      } else {
        content = `# ${agent.title} — Draft\n\n*Generated based on instruction: "${action.feedback ?? "general task"}"*\n\n(Mock content — use a real LLM provider for actual output.)`;
      }

      // Always create a NEW artifact for command-driven work
      const newArtifactId = `art-cmd-${Date.now()}`;
      const artifactTitle = action.artifactTitle
        ?? (action.feedback
          ? action.feedback.split(".")[0].replace(/^(draft|create|write|build|make|prepare|generate)\s+/i, "").trim().slice(0, 50)
          : `${agent.title} — New Draft`);

      await appendEvent(workspaceId, "artifact.updated", {
        artifact: {
          id: newArtifactId,
          title: artifactTitle.charAt(0).toUpperCase() + artifactTitle.slice(1),
          type: "document",
          status: "needs_review" as const,
          currentVersion: 1,
          versions: [
            {
              version: 1,
              createdAt: Date.now(),
              content,
              notes: `Created by ${agent.displayName} (${agent.title}) — ${action.feedback ?? "coordinator instruction"}`,
              sourceTaskIds: [task.id],
              citations: [],
            },
          ],
        },
      });

      // Mark task as completed
      await appendEvent(workspaceId, "task.completed", {
        taskId: task.id,
        agentId: agent.agentId,
      });

      return `${agent.displayName} has completed the task. Check the deliverables panel.`;
    }

    case "revise_deliverable": {
      const artifact = snapshot.artifacts.find(
        (a) =>
          a.title.toLowerCase().includes(action.artifactTitle?.toLowerCase() ?? ""),
      );
      if (!artifact) {
        return `Could not find deliverable "${action.artifactTitle}".`;
      }

      const task = snapshot.tasks.find((t) =>
        t.linkedArtifactIds.includes(artifact.id),
      );
      if (!task) {
        return `No task linked to "${artifact.title}".`;
      }

      const agent = snapshot.agents.find((a) => a.agentId === task.ownerAgentId);

      await appendEvent(workspaceId, "task.started", {
        taskId: task.id,
        agentId: task.ownerAgentId,
        state: task.workType,
      });

      let revisedContent = "";
      if (isReal) {
        const currentContent =
          artifact.versions[artifact.versions.length - 1]?.content ?? "";
        const revisionTask = {
          ...task,
          description: `REVISION: ${action.feedback ?? "Improve and enhance this deliverable."}\n\nPrevious version:\n${currentContent}`,
        };
        revisedContent = await generateArtifactContent(
          providerId,
          revisionTask,
          agent ?? null,
          snapshot.workspace.title,
          snapshot.summary ?? "",
        );
      }

      const newVersion = artifact.currentVersion + 1;
      const finalContent =
        revisedContent ||
        artifact.versions[artifact.versions.length - 1]?.content ||
        "";

      await appendEvent(workspaceId, "artifact.updated", {
        artifact: {
          ...artifact,
          status: "needs_review" as const,
          currentVersion: newVersion,
          versions: [
            ...artifact.versions,
            {
              version: newVersion,
              createdAt: Date.now(),
              content: finalContent,
              notes: `Revised: ${action.feedback ?? "General improvement"}`,
              sourceTaskIds: [task.id],
              citations: [],
            },
          ],
        },
      });

      await appendEvent(workspaceId, "task.completed", {
        taskId: task.id,
        agentId: task.ownerAgentId,
      });

      return `"${artifact.title}" has been revised. Check the deliverables panel.`;
    }

    case "add_agent": {
      // Create a new agent event
      const newAgentId = `agent-${Date.now()}`;
      const agentNames = [
        "Harper", "Phoenix", "Sage", "Dakota", "Finley", "Rowan",
        "Ellis", "Blair", "Lennox", "Skylar", "Reese", "Emery",
      ];
      const usedNames = snapshot.agents.map((a) => a.displayName);
      const availableName =
        agentNames.find((n) => !usedNames.includes(n)) ?? `Agent${snapshot.agents.length + 1}`;

      await appendEvent(workspaceId, "agent.created", {
        agentId: newAgentId,
        displayName: availableName,
        title: action.newAgentTitle ?? "Specialist",
        purpose: action.newAgentPurpose ?? "Support the team with specialized work.",
      });

      // Create a task for this agent
      const taskId = `task-${Date.now()}`;
      const artifactId = `art-${Date.now()}`;

      await appendEvent(workspaceId, "task.created", {
        taskId,
        title: `${action.newAgentTitle}: ${action.newAgentPurpose ?? "Specialist work"}`,
        ownerAgentId: newAgentId,
        description: action.newAgentPurpose ?? "",
        workType: "writing",
        linkedArtifactIds: [artifactId],
      });

      await appendEvent(workspaceId, "artifact.updated", {
        artifact: {
          id: artifactId,
          title: action.newAgentTitle ?? "New Deliverable",
          type: "document",
          status: "draft" as const,
          currentVersion: 1,
          versions: [
            {
              version: 1,
              createdAt: Date.now(),
              content: `# ${action.newAgentTitle}\n\n*Pending — ${availableName} will begin working on this shortly.*`,
              notes: "Placeholder created with agent.",
              sourceTaskIds: [taskId],
              citations: [],
            },
          ],
        },
      });

      return `New agent "${availableName}" (${action.newAgentTitle}) has been hired and assigned. They'll start working on their deliverable.`;
    }

    default:
      return "";
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const body = schema.parse(await request.json());

    // Save the command as an event
    await appendEvent(workspaceId, "command.received", {
      message: body.message,
      source: body.source,
    });

    const workspace = await getWorkspaceRecord(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const snapshot = await getWorkspaceSnapshot(workspaceId);
    const providerId = workspace.providerId;
    const provider = getProviderAdapter(providerId);

    let responseText: string;
    let actionResult = "";

    if (providerId === "mock" || !provider.isConfigured()) {
      responseText = `Acknowledged: "${body.message}". (Mock provider — no action taken.)`;
    } else {
      try {
        // Ask coordinator what to do
        const coordinatorPrompt = buildCoordinatorPrompt(snapshot, body.message);
        const result = await provider.complete({
          system: coordinatorPrompt,
          prompt: body.message,
        });

        const action = parseCoordinatorResponse(result.text);
        responseText = action.explanation;

        // Execute the action if any
        if (action.action !== "none") {
          actionResult = await executeAction(
            workspaceId,
            action,
            snapshot,
            providerId,
          );
          responseText = `${action.explanation}\n\n${actionResult}`;
        }
      } catch (err) {
        console.error("[command] Coordinator failed:", err);
        responseText = `I understood "${body.message}" but encountered an error executing. Please try again.`;
      }
    }

    // Save the response
    await appendEvent(workspaceId, "command.response", {
      message: body.message,
      response: responseText,
    });

    // Return fresh snapshot
    const updatedSnapshot = await getWorkspaceSnapshot(workspaceId);

    return NextResponse.json({
      acknowledged: true,
      message: body.message,
      response: responseText,
      snapshot: updatedSnapshot,
    });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Command failed." },
      { status: 400 },
    );
  }
}
