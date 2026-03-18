import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ApprovalGateCard } from "@/components/sidebar/approval-gate-card";
import type { ApprovalGate } from "@/lib/types";

describe("ApprovalGateCard", () => {
  const pendingGate: ApprovalGate = {
    gateType: "team_proposal",
    status: "pending",
    message: "4 agents proposed",
    requestedAt: Date.now(),
  };

  const approvedGate: ApprovalGate = {
    ...pendingGate,
    status: "approved",
    resolvedAt: Date.now(),
  };

  it("renders pending gate with approve button", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalGateCard gate={pendingGate} isBusy={false} onApprove={onApprove} />,
    );
    expect(screen.getByText("team proposal")).toBeTruthy();
    expect(screen.getByText("Validate")).toBeTruthy();
  });

  it("calls onApprove when button clicked", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalGateCard gate={pendingGate} isBusy={false} onApprove={onApprove} />,
    );
    fireEvent.click(screen.getByText("Validate"));
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it("renders approved gate without button", () => {
    render(
      <ApprovalGateCard gate={approvedGate} isBusy={false} onApprove={() => {}} />,
    );
    expect(screen.getByText("✓ Validated")).toBeTruthy();
    expect(screen.queryByText("Validate")).toBeNull();
  });

  it("disables button when busy", () => {
    render(
      <ApprovalGateCard gate={pendingGate} isBusy={true} onApprove={() => {}} />,
    );
    const btn = screen.getByText("...");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
