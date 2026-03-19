import { NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent } from "@/lib/db/client";
import { getWorkspaceSnapshot } from "@/lib/runtime/engine";
import type { ArtifactStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["draft", "needs_review", "approved", "superseded"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string; artifactId: string }> },
) {
  try {
    const { workspaceId, artifactId } = await context.params;
    const body = schema.parse(await request.json());

    // Get the current snapshot to find the artifact
    const snapshot = await getWorkspaceSnapshot(workspaceId);
    const artifact = snapshot.artifacts.find((a) => a.id === artifactId);

    if (!artifact) {
      return NextResponse.json(
        { error: `Artifact "${artifactId}" not found.` },
        { status: 404 },
      );
    }

    // Emit an artifact.updated event with the new status
    await appendEvent(workspaceId, "artifact.updated", {
      artifact: {
        ...artifact,
        status: body.status as ArtifactStatus,
      },
    });

    const updatedSnapshot = await getWorkspaceSnapshot(workspaceId);
    return NextResponse.json(updatedSnapshot);
  } catch (cause) {
    return NextResponse.json(
      {
        error: cause instanceof Error ? cause.message : "Status update failed.",
      },
      { status: 400 },
    );
  }
}
