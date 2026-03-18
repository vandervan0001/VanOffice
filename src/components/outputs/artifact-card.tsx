"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ArtifactRecord, ArtifactStatus } from "@/lib/types";

interface ArtifactCardProps {
  artifact: ArtifactRecord;
  isNew?: boolean;
}

const STATUS_STYLES: Record<ArtifactStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-500" },
  needs_review: { bg: "bg-[var(--attention-bg)]", text: "text-[var(--attention)]" },
  approved: { bg: "bg-[var(--success-bg)]", text: "text-[var(--success)]" },
  superseded: { bg: "bg-gray-100 line-through", text: "text-gray-400" },
};

export function ArtifactCard({ artifact, isNew }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[artifact.status];
  const currentContent = artifact.versions.find(
    (v) => v.version === artifact.currentVersion,
  )?.content;

  const preview = currentContent?.split("\n").slice(0, 3).join("\n") ?? "";

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`min-w-[220px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:shadow-sm ${
          isNew ? "animate-pulse-once" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {artifact.title}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {artifact.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
          v{artifact.currentVersion}
        </p>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
          {preview}
        </p>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {artifact.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  v{artifact.currentVersion} · {artifact.status.replaceAll("_", " ")} · {artifact.schema}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>
            {currentContent && (
              <article className="prose prose-sm mt-4 max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentContent}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </div>
      )}
    </>
  );
}
