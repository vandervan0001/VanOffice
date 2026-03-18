import { NextResponse } from "next/server";
import { z } from "zod";

import { approveGate } from "@/lib/runtime/engine";

export const dynamic = "force-dynamic";

const schema = z.object({
  gateType: z.enum(["team_proposal", "execution_plan", "final_deliverables"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const body = schema.parse(await request.json());
    const snapshot = await approveGate(workspaceId, body.gateType);
    return NextResponse.json(snapshot);
  } catch (cause) {
    return NextResponse.json(
      {
        error: cause instanceof Error ? cause.message : "Approval failed.",
      },
      { status: 400 },
    );
  }
}
