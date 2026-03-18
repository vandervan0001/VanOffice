import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WorkspaceShell } from "@/components/workspace-shell";

// Mock child components to isolate shell layout testing
vi.mock("@/components/office/office-view", () => ({
  OfficeView: () => <div data-testid="office-view">Office</div>,
}));
vi.mock("@/components/composer/mission-composer", () => ({
  MissionComposer: () => <div data-testid="mission-composer">Composer</div>,
}));
vi.mock("@/components/sidebar/approval-sidebar", () => ({
  ApprovalSidebar: () => <div data-testid="approval-sidebar">Sidebar</div>,
}));
vi.mock("@/components/outputs/artifact-panel", () => ({
  ArtifactPanel: () => <div data-testid="artifact-panel">Artifacts</div>,
}));

const providers = [{ id: "mock", label: "Mock", configured: true }];

describe("WorkspaceShell", () => {
  it("renders office view and composer when no workspace", () => {
    render(<WorkspaceShell providers={providers} />);
    expect(screen.getByTestId("office-view")).toBeTruthy();
    expect(screen.getByTestId("mission-composer")).toBeTruthy();
  });
});
