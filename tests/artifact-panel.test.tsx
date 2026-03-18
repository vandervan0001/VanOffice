import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ArtifactPanel } from "@/components/outputs/artifact-panel";
import type { ArtifactRecord } from "@/lib/types";

describe("ArtifactPanel", () => {
  const artifact: ArtifactRecord = {
    id: "a1",
    title: "Research Brief",
    type: "document",
    status: "draft",
    schema: "markdown",
    provenance: [],
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: Date.now(),
        content: "# Research\n\nFirst line.\nSecond line.\nThird line.\nFourth line.",
        notes: "",
        sourceTaskIds: [],
        citations: [],
      },
    ],
  };

  it("renders empty state when no artifacts", () => {
    render(<ArtifactPanel artifacts={[]} />);
    expect(screen.getByText(/artifacts will appear/i)).toBeTruthy();
  });

  it("renders artifact rows in table", () => {
    render(<ArtifactPanel artifacts={[artifact]} />);
    expect(screen.getByText("Research Brief")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText("v1")).toBeTruthy();
  });
});
