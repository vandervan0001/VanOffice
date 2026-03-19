import { NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent } from "@/lib/db/client";
import { getWorkspaceSnapshot } from "@/lib/runtime/engine";

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

    // TODO v2: Route the command to the appropriate agent(s) for processing.
    // For now, the command is logged as an event but not yet acted upon by agents.

    const snapshot = await getWorkspaceSnapshot(workspaceId);
    return NextResponse.json({
      acknowledged: true,
      message: body.message,
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
