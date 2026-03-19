"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ArtifactRecord, ArtifactStatus } from "@/lib/types";

interface AgentInfo {
  id: string;
  name: string;
  roleTitle: string;
}

interface ArtifactPanelProps {
  artifacts: ArtifactRecord[];
  agents?: AgentInfo[];
  workspaceId?: string;
  onSnapshotUpdate?: () => void;
}

type SortKey = "title" | "status" | "version" | "updatedAt" | "agent";
type SortDir = "asc" | "desc";

const STATUS_BADGE: Record<ArtifactStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-500", label: "Draft" },
  needs_review: { bg: "bg-[var(--attention-bg)]", text: "text-[var(--attention)]", label: "Needs review" },
  approved: { bg: "bg-[var(--success-bg)]", text: "text-[var(--success)]", label: "Approved" },
  superseded: { bg: "bg-gray-100", text: "text-gray-400 line-through", label: "Superseded" },
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getLatestTimestamp(artifact: ArtifactRecord): number {
  const current = artifact.versions.find((v) => v.version === artifact.currentVersion);
  return current?.createdAt ?? 0;
}

function getAgentLabel(artifact: ArtifactRecord, agents?: AgentInfo[]): string {
  const provId = artifact.provenance?.[0];
  if (!provId) return "-";
  // Try to find agent by matching provenance to agent list
  if (agents?.length) {
    const match = agents.find(a => a.id === provId);
    if (match) return match.name;
  }
  // Fallback: extract agent name from task title if it contains ":"
  // e.g. "Research Analyst: Gather evidence..." → "Research Analyst"
  const taskTitle = artifact.title;
  if (taskTitle.includes(":")) return taskTitle.split(":")[0].trim();
  // Last fallback: use artifact title as agent name
  return taskTitle;
}

export function ArtifactPanel({ artifacts, agents, workspaceId, onSnapshotUpdate }: ArtifactPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ArtifactStatus>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [reviseFeedback, setReviseFeedback] = useState("");

  async function handleValidate(id: string) {
    if (!workspaceId) {
      // Fallback: local-only status change
      setStatusOverrides((prev) => ({ ...prev, [id]: "approved" }));
      return;
    }

    setBusyAction(id);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/artifacts/${id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );
      if (res.ok) {
        setStatusOverrides((prev) => ({ ...prev, [id]: "approved" }));
        onSnapshotUpdate?.();
      }
    } catch {
      // Fallback to local
      setStatusOverrides((prev) => ({ ...prev, [id]: "approved" }));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRevise(id: string) {
    if (!workspaceId) return;

    setBusyAction(id);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId: id,
          feedback: reviseFeedback || undefined,
        }),
      });
      if (res.ok) {
        setReviseId(null);
        setReviseFeedback("");
        onSnapshotUpdate?.();
      }
    } catch {
      // Silently fail
    } finally {
      setBusyAction(null);
    }
  }

  function handleArchive(id: string) {
    setStatusOverrides((prev) => ({ ...prev, [id]: "superseded" }));
  }

  function handleDelete(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
  }

  const sorted = useMemo(() => {
    const copy = artifacts.filter((a) => !hiddenIds.has(a.id));
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "version":
          cmp = a.currentVersion - b.currentVersion;
          break;
        case "updatedAt":
          cmp = getLatestTimestamp(a) - getLatestTimestamp(b);
          break;
        case "agent":
          cmp = getAgentLabel(a, agents).localeCompare(getAgent(b));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [artifacts, sortKey, sortDir, hiddenIds]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "updatedAt" ? "desc" : "asc");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-[10px]">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
  };

  if (artifacts.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
          Deliverables
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Artifacts will appear here once the team starts working.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-3 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        Deliverables
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => handleSort("title")}>
                Title{sortIndicator("title")}
              </th>
              <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => handleSort("status")}>
                Status{sortIndicator("status")}
              </th>
              <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => handleSort("version")}>
                Version{sortIndicator("version")}
              </th>
              <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => handleSort("updatedAt")}>
                Last Updated{sortIndicator("updatedAt")}
              </th>
              <th className="cursor-pointer pb-2 pr-3 font-medium" onClick={() => handleSort("agent")}>
                Agent{sortIndicator("agent")}
              </th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((artifact) => {
              const effectiveStatus = statusOverrides[artifact.id] ?? artifact.status;
              const badge = STATUS_BADGE[effectiveStatus];
              const isExpanded = expandedId === artifact.id;
              const isBusy = busyAction === artifact.id;
              const isRevising = reviseId === artifact.id;
              const currentContent = artifact.versions.find(
                (v) => v.version === artifact.currentVersion,
              )?.content;

              const canValidate = effectiveStatus === "needs_review" || effectiveStatus === "draft";
              const canRevise = effectiveStatus !== "approved" && effectiveStatus !== "superseded";

              return (
                <tr
                  key={artifact.id}
                  className="group border-b border-[var(--border)]/50 last:border-b-0"
                >
                  <td colSpan={6} className="p-0">
                    {/* Row */}
                    <div className="flex w-full items-center py-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(artifact.id)}
                        className="flex min-w-0 flex-1 items-center text-left transition hover:bg-[var(--background)]/50"
                      >
                        <span className="min-w-0 flex-[3] truncate pr-3 text-sm font-medium text-[var(--foreground)]">
                          {artifact.title}
                        </span>
                        <span className="flex-[2] pr-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </span>
                        <span className="flex-[1] pr-3 text-xs text-[var(--text-secondary)]">
                          v{artifact.currentVersion}
                        </span>
                        <span className="flex-[2] pr-3 text-xs text-[var(--text-secondary)]">
                          {formatRelativeTime(getLatestTimestamp(artifact))}
                        </span>
                        <span className="flex-[2] truncate pr-3 text-xs text-[var(--text-secondary)]">
                          {getAgentLabel(artifact, agents)}
                        </span>
                        <span className="flex-none text-xs text-[var(--text-muted)] transition group-hover:text-[var(--foreground)]">
                          {isExpanded ? "\u25B4" : "\u25BE"}
                        </span>
                      </button>
                      {/* Action buttons */}
                      <span className="ml-2 flex flex-none items-center gap-1.5">
                        {canValidate && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleValidate(artifact.id)}
                            className="rounded-md bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)] transition hover:bg-[var(--success)]/20 disabled:opacity-40"
                          >
                            {isBusy ? "..." : "Validate"}
                          </button>
                        )}
                        {canRevise && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setReviseId(isRevising ? null : artifact.id)}
                            className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600 transition hover:bg-orange-100 disabled:opacity-40"
                          >
                            Revise
                          </button>
                        )}
                        {effectiveStatus !== "superseded" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(artifact.id)}
                            className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 transition hover:bg-gray-200"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(artifact.id)}
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </span>
                    </div>

                    {/* Revise feedback input */}
                    {isRevising && (
                      <div className="flex items-center gap-2 border-t border-[var(--border)]/30 bg-orange-50/30 px-3 py-2">
                        <input
                          type="text"
                          value={reviseFeedback}
                          onChange={(e) => setReviseFeedback(e.target.value)}
                          placeholder="Optional revision feedback..."
                          className="flex-1 rounded-lg border border-orange-200 bg-white px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-orange-300 focus:border-orange-400 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRevise(artifact.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRevise(artifact.id)}
                          className="rounded-md bg-orange-500 px-3 py-1 text-[10px] font-medium text-white transition hover:bg-orange-600 disabled:opacity-40"
                        >
                          {isBusy ? "Revising..." : "Send revision"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviseId(null);
                            setReviseFeedback("");
                          }}
                          className="rounded-md px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Expanded content */}
                    {isExpanded && currentContent && (
                      <div className="border-t border-[var(--border)]/30 bg-[var(--background)]/30 px-3 py-3">
                        <article className="prose prose-sm max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {currentContent}
                          </ReactMarkdown>
                        </article>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
