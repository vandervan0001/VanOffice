import type { WorkspaceSnapshot } from "@/lib/types";
import { ApprovalGateCard } from "./approval-gate-card";

interface ApprovalSidebarProps {
  snapshot: WorkspaceSnapshot;
  busyGate: string | null;
  onApprove: (gateType: string) => void;
}

export function ApprovalSidebar({
  snapshot,
  busyGate,
  onApprove,
}: ApprovalSidebarProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        Validations
      </p>
      {snapshot.approvals.map((gate) => (
        <ApprovalGateCard
          key={gate.gateType}
          gate={gate}
          isBusy={busyGate === gate.gateType}
          onApprove={() => onApprove(gate.gateType)}
          teamProposal={snapshot.teamProposal ?? undefined}
          tasks={snapshot.tasks}
        />
      ))}
      {snapshot.approvals.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          No checkpoints yet.
        </p>
      )}
    </div>
  );
}
