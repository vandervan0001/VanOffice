import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WorkspaceShell } from "@/components/workspace-shell";

// Mock next/dynamic to render the component synchronously in tests
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Return a placeholder component for tests — dynamic import won't resolve in jsdom
    const Placeholder = () => <div data-testid="office-view">Office</div>;
    Placeholder.displayName = "DynamicMock";
    return Placeholder;
  },
}));
// Keep the old mock in case anything else imports it
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
vi.mock("@/components/sidebar/command-input", () => ({
  CommandInput: () => <div data-testid="command-input">Commands</div>,
}));

const providers = [{ id: "mock", label: "Mock", configured: true }];

describe("WorkspaceShell", () => {
  it("renders composer when no workspace", () => {
    render(<WorkspaceShell providers={providers} />);
    expect(screen.getByTestId("mission-composer")).toBeTruthy();
  });
});
