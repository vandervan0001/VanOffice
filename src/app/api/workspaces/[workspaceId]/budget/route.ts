import { NextResponse } from "next/server";

import { getPaperclipBudget } from "@/lib/runtime/paperclip-executor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const budget = getPaperclipBudget(workspaceId);

  return NextResponse.json(budget);
}
