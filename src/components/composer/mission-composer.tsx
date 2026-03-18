"use client";

import { useMemo, useState } from "react";

interface ProviderOption {
  id: string;
  label: string;
  configured: boolean;
}

interface MissionComposerProps {
  providers: ProviderOption[];
  onCreated: (workspaceId: string) => void;
}

const DEMO_GOAL = "Create a marketing intelligence packet";
const DEMO_OUTPUTS = "Research brief, action plan, and a polished final packet";
const DEMO_BRIEF = [
  "Context:",
  "We are launching a B2B AI operations tool for small agencies in Europe.",
  "Current traction is weak because messaging is generic and positioning is unclear.",
  "",
  "Mission:",
  "Build a clear market intelligence packet to sharpen positioning and go-to-market moves for the next 6 weeks.",
  "",
  "Constraints:",
  "- Keep recommendations realistic for a 2-person founding team.",
  "- Prioritize actions that can be executed within 10 business days.",
  "- Avoid assumptions that require paid enterprise data sources.",
  "",
  "Audience:",
  "Founders, growth lead, and one freelance content operator.",
  "",
  "Success criteria:",
  "- One concise market snapshot.",
  "- One ranked action plan with rationale.",
  "- One final synthesis packet ready for internal review and execution kickoff.",
].join("\n");

export function MissionComposer({ providers, onCreated }: MissionComposerProps) {
  const defaultProvider = useMemo(
    () => providers.find((p) => p.configured)?.id ?? providers[0]?.id ?? "mock",
    [providers],
  );
  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [outputs, setOutputs] = useState("");
  const [providerId, setProviderId] = useState(defaultProvider);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadDemo() {
    setGoal(DEMO_GOAL);
    setOutputs(DEMO_OUTPUTS);
    setBrief(DEMO_BRIEF);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("rawBrief", brief);
    fd.set("missionGoal", goal);
    fd.set("outputExpectations", outputs);
    fd.set("providerId", providerId);
    files.forEach((f) => fd.append("files", f));

    try {
      const res = await fetch("/api/workspaces", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to create workspace.");
        return;
      }
      const { workspaceId } = await res.json() as { workspaceId: string };
      onCreated(workspaceId);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-sm" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          Create your team
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Describe your mission, and we'll propose the right team.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Mission goal
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--success)]"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Build a competitive analysis for our product launch"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Expected outputs
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--success)]"
              value={outputs}
              onChange={(e) => setOutputs(e.target.value)}
              placeholder="e.g. Research brief, action plan, final report"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Mission brief
            </span>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-[var(--success)]"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe context, constraints, audience, and success criteria..."
              required
            />
          </label>

          {/* File drop */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {files.length > 0
                ? `${files.length} file(s) attached`
                : "📎 Attach a brief or supporting docs"}
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>

          {/* Provider + Submit */}
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="text-xs text-[var(--text-secondary)]">Provider</span>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}{p.configured ? "" : " (not configured)"}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Building team..." : "Propose a team →"}
            </button>
          </div>
        </div>

        {/* Demo preset */}
        <button
          type="button"
          onClick={loadDemo}
          className="mt-3 text-xs text-[var(--text-muted)] underline decoration-dotted transition hover:text-[var(--text-secondary)]"
        >
          Try with an example
        </button>

        {error && (
          <p className="mt-3 text-sm text-[var(--attention)]">{error}</p>
        )}
      </form>
    </div>
  );
}
