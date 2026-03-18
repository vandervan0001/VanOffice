import type { WorkspaceSnapshot } from "@/lib/types";
import { ApprovalGateCard } from "./approval-gate-card";
import { CommandInput } from "./command-input";

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
    <aside className="flex h-full flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex-1 space-y-3">
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

      <div className="border-t border-[var(--border)] pt-3">
        <CommandInput />
      </div>
    </aside>
  );
}
