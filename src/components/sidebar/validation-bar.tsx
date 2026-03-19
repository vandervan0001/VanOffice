"use client";

import { useState } from "react";
import type { ApprovalGate, TeamProposal, TaskCard } from "@/lib/types";

interface ValidationBarProps {
  approvals: ApprovalGate[];
  busyGate: string | null;
  onApprove: (gateType: string, feedback?: string) => void;
  teamProposal?: TeamProposal;
  tasks: TaskCard[];
}

export function ValidationBar({
  approvals,
  busyGate,
  onApprove,
  teamProposal,
  tasks,
}: ValidationBarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const pendingCount = approvals.filter((g) => g.status === "pending").length;
  const allApproved = approvals.length > 0 && pendingCount === 0;

  return (
    <>
      {/* Compact bar */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm transition hover:border-[var(--foreground)]/20 hover:shadow-sm"
      >
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Validations
        </span>
        {approvals.length === 0 ? (
          <span className="text-xs text-[var(--text-muted)]">
            No checkpoints yet
          </span>
        ) : allApproved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
            All validated
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pending-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--pending)]">
            {pendingCount} pending
          </span>
        )}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              &times;
            </button>

            <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
              Approval Gates
            </h2>

            {approvals.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                No checkpoints yet.
              </p>
            )}

            <div className="max-h-[70vh] space-y-3 overflow-y-auto">
              {approvals.map((gate) => (
                <GateCard
                  key={gate.gateType}
                  gate={gate}
                  isBusy={busyGate === gate.gateType}
                  onApprove={onApprove}
                  teamProposal={teamProposal}
                  tasks={tasks}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Gate card inside modal ---------- */

function GateCard({
  gate,
  isBusy,
  onApprove,
  teamProposal,
  tasks,
}: {
  gate: ApprovalGate;
  isBusy: boolean;
  onApprove: (gateType: string, feedback?: string) => void;
  teamProposal?: TeamProposal;
  tasks?: TaskCard[];
}) {
  const isPending = gate.status === "pending";
  const isApproved = gate.status === "approved";
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [hiddenAgents, setHiddenAgents] = useState<Set<string>>(new Set());
  const [newRole, setNewRole] = useState("");
  const [addedRoles, setAddedRoles] = useState<string[]>([]);

  const bgClass = isPending
    ? "bg-[var(--pending-bg)] border-[var(--pending)]"
    : isApproved
      ? "bg-[var(--success-bg)] border-[var(--success)]/30"
      : "bg-[#f5f5f5] border-[var(--border)]";

  return (
    <div className={`rounded-xl border p-4 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-[var(--foreground)]">
            {gate.gateType.replaceAll("_", " ")}
          </p>
          {isApproved && (
            <span className="text-xs text-[var(--success)]">Validated</span>
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

      {/* Team proposal details */}
      {isPending && gate.gateType === "team_proposal" && teamProposal && (
        <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Proposed team: {teamProposal.name}
          </p>
          {teamProposal.roles
            .filter((member) => !hiddenAgents.has(member.agentId))
            .map((member) => (
              <div
                key={member.agentId}
                className="group relative rounded-lg bg-white/60 p-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    setHiddenAgents(
                      (prev) => new Set([...prev, member.agentId]),
                    )
                  }
                  className="absolute right-1.5 top-1.5 hidden h-4 w-4 items-center justify-center rounded-full text-[10px] text-[var(--text-muted)] transition hover:bg-[var(--attention-bg)] hover:text-[var(--attention)] group-hover:flex"
                  title="Remove from team"
                >
                  &times;
                </button>
                <p className="text-xs font-medium">{member.displayName}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {member.title} — {member.rationale}
                </p>
              </div>
            ))}

          {/* Added roles (UI-only) */}
          {addedRoles.map((role) => (
            <div
              key={role}
              className="group relative rounded-lg border border-dashed border-[var(--border)] bg-white/40 p-2"
            >
              <button
                type="button"
                onClick={() =>
                  setAddedRoles((prev) => prev.filter((r) => r !== role))
                }
                className="absolute right-1.5 top-1.5 hidden h-4 w-4 items-center justify-center rounded-full text-[10px] text-[var(--text-muted)] transition hover:bg-[var(--attention-bg)] hover:text-[var(--attention)] group-hover:flex"
                title="Remove role"
              >
                &times;
              </button>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {role}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Custom role (pending)
              </p>
            </div>
          ))}

          {/* Add role input */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newRole.trim()) {
                  setAddedRoles((prev) => [...prev, newRole.trim()]);
                  setNewRole("");
                }
              }}
              placeholder="Add a role..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-[11px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--success)]"
            />
            <button
              type="button"
              onClick={() => {
                if (newRole.trim()) {
                  setAddedRoles((prev) => [...prev, newRole.trim()]);
                  setNewRole("");
                }
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-secondary)] transition hover:border-[var(--success)] hover:text-[var(--success)]"
              title="Add role"
            >
              +
            </button>
          </div>

          <p className="text-[9px] text-[var(--text-muted)]">
            Team editing will affect execution in v3
          </p>
        </div>
      )}

      {/* Execution plan details */}
      {isPending && gate.gateType === "execution_plan" && (
        <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Task board — {tasks?.length ?? 0} tasks
          </p>
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="rounded-lg bg-white/60 p-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[var(--background)] px-1 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]">
                    {task.workType}
                  </span>
                  <p className="text-xs font-medium">{task.title}</p>
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                  {task.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-[var(--text-muted)]">
              Task board will be generated after approval.
            </p>
          )}
        </div>
      )}

      {/* Action area */}
      {isPending && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          {showFeedback ? (
            <div className="space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add notes, adjustments, or concerns..."
                className="w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-xs leading-relaxed text-[var(--foreground)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--success)]"
                rows={3}
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Your feedback will be attached to this approval. In v3, the team
                will adapt based on your notes.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="text-[11px] text-[var(--text-secondary)] underline decoration-dotted transition hover:text-[var(--foreground)]"
            >
              Add feedback or adjustments...
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onApprove(gate.gateType, feedback || undefined)}
              disabled={isBusy}
              className="flex-1 rounded-lg bg-[var(--success)] px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isBusy
                ? "..."
                : feedback
                  ? "Validate with notes"
                  : "Validate"}
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition disabled:cursor-not-allowed disabled:opacity-50"
              title="Reject and regenerate — coming in v3"
            >
              Reject
            </button>
          </div>
          <p className="text-center text-[9px] text-[var(--text-muted)]">
            Reject &amp; regenerate coming in v3
          </p>
        </div>
      )}
    </div>
  );
}
