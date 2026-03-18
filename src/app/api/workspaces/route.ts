import { NextResponse } from "next/server";

import { createWorkspaceFromMission } from "@/lib/runtime/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawBrief = String(formData.get("rawBrief") ?? "").trim();
    const missionGoal = String(formData.get("missionGoal") ?? "").trim();
    const outputExpectations = String(
      formData.get("outputExpectations") ?? "",
    ).trim();
    const providerId = String(formData.get("providerId") ?? "mock").trim();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!rawBrief) {
      return NextResponse.json(
        { error: "A mission brief is required." },
        { status: 400 },
      );
    }

    const snapshot = await createWorkspaceFromMission({
      rawBrief,
      missionGoal,
      outputExpectations,
      providerId,
      files,
    });

    return NextResponse.json({
      workspaceId: snapshot.workspace.id,
      snapshot,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : "Unable to create workspace.",
      },
      { status: 500 },
    );
  }
}
