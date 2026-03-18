"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ArtifactRecord, ArtifactStatus } from "@/lib/types";

interface ArtifactPanelProps {
  artifacts: ArtifactRecord[];
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

function getAgent(artifact: ArtifactRecord): string {
  return artifact.provenance?.[0] ?? "-";
}

export function ArtifactPanel({ artifacts }: ArtifactPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...artifacts];
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
          cmp = getAgent(a).localeCompare(getAgent(b));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [artifacts, sortKey, sortDir]);

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
              <th className="pb-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((artifact) => {
              const badge = STATUS_BADGE[artifact.status];
              const isExpanded = expandedId === artifact.id;
              const currentContent = artifact.versions.find(
                (v) => v.version === artifact.currentVersion,
              )?.content;

              return (
                <tr
                  key={artifact.id}
                  className="group border-b border-[var(--border)]/50 last:border-b-0"
                >
                  <td colSpan={6} className="p-0">
                    {/* Row */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(artifact.id)}
                      className="flex w-full items-center gap-0 px-0 py-2 text-left transition hover:bg-[var(--background)]/50"
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
                        {getAgent(artifact)}
                      </span>
                      <span className="flex-none text-xs text-[var(--text-muted)] transition group-hover:text-[var(--foreground)]">
                        {isExpanded ? "\u25B4" : "\u25BE"}
                      </span>
                    </button>

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
