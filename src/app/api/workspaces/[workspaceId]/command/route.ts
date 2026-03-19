import { NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent, getWorkspaceRecord } from "@/lib/db/client";
import { getWorkspaceSnapshot } from "@/lib/runtime/engine";
import { getProviderAdapter } from "@/lib/runtime/adapters/providers";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().min(1),
  source: z.enum(["user", "system"]).default("user"),
});

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

    // Build context summary for the coordinator
    const agentSummary = snapshot.agents
      .map((a) => `- ${a.displayName} (${a.title}): ${a.state}`)
      .join("\n");
    const taskSummary = snapshot.tasks
      .map((t) => `- [${t.status}] ${t.title} (owner: ${t.ownerAgentId})`)
      .join("\n");
    const artifactSummary = snapshot.artifacts
      .map((a) => `- ${a.title}: ${a.status} (v${a.currentVersion})`)
      .join("\n");

    const systemPrompt = [
      "You are the team coordinator for this workspace.",
      `Mission: ${snapshot.workspace.title}`,
      `Status: ${snapshot.runStatus}`,
      "",
      "Team:",
      agentSummary || "(no agents yet)",
      "",
      "Tasks:",
      taskSummary || "(no tasks yet)",
      "",
      "Deliverables:",
      artifactSummary || "(no deliverables yet)",
      "",
      `The user has given this instruction: "${body.message}"`,
      "Based on the team's current state and deliverables, determine what action to take.",
      "Respond with a brief acknowledgment and action plan. Keep it under 150 words.",
    ].join("\n");

    // Call the LLM
    const providerId = workspace.providerId;
    const provider = getProviderAdapter(providerId);
    let responseText: string;

    if (providerId === "mock" || !provider.isConfigured()) {
      responseText = `Acknowledged: "${body.message}". The team will process this instruction. (Mock provider — no LLM call made.)`;
    } else {
      try {
        const result = await provider.complete({
          system: systemPrompt,
          prompt: body.message,
        });
        responseText = result.text;
      } catch (err) {
        console.error("[command] LLM call failed:", err);
        responseText = `Acknowledged: "${body.message}". (LLM call failed — the command has been logged.)`;
      }
    }

    // Save the response as an event
    await appendEvent(workspaceId, "command.response", {
      message: body.message,
      response: responseText,
    });

    return NextResponse.json({
      acknowledged: true,
      message: body.message,
      response: responseText,
      snapshot,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error: cause instanceof Error ? cause.message : "Command failed.",
      },
      { status: 400 },
    );
  }
}
