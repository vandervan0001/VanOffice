import { NextResponse } from "next/server";

import { getWorkspaceSnapshot } from "@/lib/runtime/engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const snapshot = await getWorkspaceSnapshot(workspaceId);
    return NextResponse.json(snapshot);
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : "Unable to load workspace.",
      },
      { status: 404 },
    );
  }
}
