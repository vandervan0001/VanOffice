import type { ApprovalGate, TeamProposal, TaskCard } from "@/lib/types";

interface ApprovalGateCardProps {
  gate: ApprovalGate;
  isBusy: boolean;
  onApprove: () => void;
  teamProposal?: TeamProposal;
  tasks?: TaskCard[];
}

export function ApprovalGateCard({
  gate,
  isBusy,
  onApprove,
  teamProposal,
  tasks,
}: ApprovalGateCardProps) {
  const isPending = gate.status === "pending";
  const isApproved = gate.status === "approved";

  const bgClass = isPending
    ? "bg-[var(--pending-bg)] border-[var(--pending)]"
    : isApproved
      ? "bg-[var(--success-bg)] border-[var(--success)]/30"
      : "bg-[#f5f5f5] border-[var(--border)]";

  return (
    <div className={`rounded-xl border p-3 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-[var(--foreground)]">
            {gate.gateType.replaceAll("_", " ")}
          </p>
          {isApproved && (
            <span className="text-xs text-[var(--success)]">✓ Validated</span>
          )}
        </div>
        {!isPending && !isApproved && (
          <span className="text-xs text-[var(--text-muted)]">Coming up</span>
        )}
      </div>

      {gate.message && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {gate.message}
        </p>
      )}

      {isPending && gate.gateType === "team_proposal" && teamProposal && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Proposed team: {teamProposal.name}
          </p>
          {teamProposal.roles.map((member) => (
            <div key={member.agentId} className="rounded-lg bg-white/60 p-2">
              <p className="text-xs font-medium">{member.displayName}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {member.title} — {member.rationale}
              </p>
            </div>
          ))}
        </div>
      )}

      {isPending && gate.gateType === "execution_plan" && tasks && tasks.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Task board
          </p>
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg bg-white/60 p-2">
              <p className="text-xs font-medium">{task.title}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {task.workType} — {task.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {isPending && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isBusy}
            className="rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isBusy ? "..." : "Validate"}
          </button>
        </div>
      )}
    </div>
  );
}
