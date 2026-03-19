import { NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent, getWorkspaceRecord } from "@/lib/db/client";
import { getWorkspaceSnapshot } from "@/lib/runtime/engine";
import { generateArtifactContent } from "@/lib/runtime/scheduler";
import { getProviderAdapter } from "@/lib/runtime/adapters/providers";

export const dynamic = "force-dynamic";

const schema = z.object({
  artifactId: z.string().min(1),
  feedback: z.string().optional().default(""),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const body = schema.parse(await request.json());

    const workspace = await getWorkspaceRecord(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const snapshot = await getWorkspaceSnapshot(workspaceId);
    const artifact = snapshot.artifacts.find((a) => a.id === body.artifactId);
    if (!artifact) {
      return NextResponse.json(
        { error: `Artifact "${body.artifactId}" not found.` },
        { status: 404 },
      );
    }

    // Find the task that produced this artifact
    const task = snapshot.tasks.find((t) => t.linkedArtifactIds.includes(body.artifactId));
    if (!task) {
      return NextResponse.json(
        { error: `No task linked to artifact "${body.artifactId}".` },
        { status: 404 },
      );
    }

    const agent = snapshot.agents.find((a) => a.agentId === task.ownerAgentId);
    const providerId = workspace.providerId;
    const provider = getProviderAdapter(providerId);
    const isRealProvider = providerId !== "mock" && provider.isConfigured();

    // Mark task as re-started
    await appendEvent(workspaceId, "task.started", {
      taskId: task.id,
      agentId: task.ownerAgentId,
      state: task.workType,
    });

    let revisedContent = "";

    if (isRealProvider) {
      // Prepend revision feedback to the task for the LLM
      const revisionTask = {
        ...task,
        description: body.feedback
          ? `REVISION REQUESTED: ${body.feedback}\n\nOriginal task: ${task.description}`
          : `REVISION REQUESTED: Please improve and refine the previous output.\n\nOriginal task: ${task.description}`,
      };

      revisedContent = await generateArtifactContent(
        providerId,
        revisionTask,
        agent,
        snapshot.workspace.title,
        snapshot.summary ?? "",
      );
    }

    // Use revised content or keep existing with a revision note
    const currentVersion = artifact.versions.find(
      (v) => v.version === artifact.currentVersion,
    );
    const finalContent = revisedContent || currentVersion?.content || "";
    const newVersion = artifact.currentVersion + 1;

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
            notes: body.feedback
              ? `Revision based on feedback: ${body.feedback}`
              : "Revision requested without specific feedback.",
            sourceTaskIds: [task.id],
            citations: [],
          },
        ],
      },
    });

    // Mark task as completed
    await appendEvent(workspaceId, "task.completed", {
      taskId: task.id,
      agentId: task.ownerAgentId,
    });

    const updatedSnapshot = await getWorkspaceSnapshot(workspaceId);
    return NextResponse.json(updatedSnapshot);
  } catch (cause) {
    return NextResponse.json(
      {
        error: cause instanceof Error ? cause.message : "Revision failed.",
      },
      { status: 400 },
    );
  }
}
