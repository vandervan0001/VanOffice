"use client";

import { useMemo, useState } from "react";

type ProviderOption = {
  id: string;
  label: string;
  configured: boolean;
};

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

export function MissionComposer({
  providers,
  onCreated,
}: MissionComposerProps) {
  const defaultProvider = useMemo(
    () => providers.find((provider) => provider.configured)?.id ?? providers[0]?.id ?? "mock",
    [providers],
  );
  const [brief, setBrief] = useState(DEMO_BRIEF);
  const [goal, setGoal] = useState(DEMO_GOAL);
  const [outputs, setOutputs] = useState(DEMO_OUTPUTS);
  const [providerId, setProviderId] = useState(defaultProvider);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("rawBrief", brief);
    formData.set("missionGoal", goal);
    formData.set("outputExpectations", outputs);
    formData.set("providerId", providerId);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/workspaces", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to create the workspace.");
      setPending(false);
      return;
    }

    const payload = (await response.json()) as { workspaceId: string };
    onCreated(payload.workspaceId);
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[28px] border border-white/10 bg-black/35 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur"
    >
      <div className="grid gap-2">
        <p className="text-xs uppercase tracking-[0.32em] text-[#f2c14e]">
          Create team
        </p>
        <h2 className="text-3xl font-semibold text-[#f8f4e9]">
          Brief the team you want to watch.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[#d8d3c6]">
          Drop a mission, attach background files, pick a provider, and Team
          Foundry will propose a lean crew before anything starts moving.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[#e7e2d2]">Mission goal</span>
          <input
            className="rounded-2xl border border-white/10 bg-[#16181d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c14e]"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Need a research-driven marketing team"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[#e7e2d2]">Expected outputs</span>
          <input
            className="rounded-2xl border border-white/10 bg-[#16181d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c14e]"
            value={outputs}
            onChange={(event) => setOutputs(event.target.value)}
            placeholder="Reports, plans, memos"
          />
        </label>
      </div>

      <label className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[#e7e2d2]">Mission brief</span>
          <button
            type="button"
            onClick={() => {
              setGoal(DEMO_GOAL);
              setOutputs(DEMO_OUTPUTS);
              setBrief(DEMO_BRIEF);
            }}
            className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-[#e3ddce] transition hover:border-[#f2c14e] hover:text-[#f2c14e]"
          >
            Reset demo
          </button>
        </div>
        <textarea
          className="min-h-40 rounded-[24px] border border-white/10 bg-[#16181d] px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-[#f2c14e]"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Describe the business need, constraints, audience, and success criteria."
          required
        />
        <span className="text-xs text-[#8d8a83]">
          A ready-to-run demo brief is preloaded so you can test immediately.
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        <label className="grid gap-2 rounded-[24px] border border-dashed border-white/15 bg-[#14171b] p-4">
          <span className="text-sm text-[#e7e2d2]">Drop brief files</span>
          <input
            type="file"
            multiple
            className="text-xs text-[#c6c1b5]"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <span className="text-xs text-[#8d8a83]">
            {files.length > 0
              ? `${files.length} file(s) queued`
              : "Upload PDFs, docs, markdown, or text context."}
          </span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[#e7e2d2]">Provider</span>
          <select
            className="rounded-2xl border border-white/10 bg-[#16181d] px-4 py-3 text-sm text-white outline-none transition focus:border-[#f2c14e]"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
                {provider.configured ? "" : " (not configured)"}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="mt-auto rounded-2xl bg-[#f2c14e] px-4 py-3 text-sm font-semibold text-[#1b1508] transition hover:bg-[#ffd86f] disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? "Building team..." : "Propose the team"}
          </button>
        </label>
      </div>

      {error ? <p className="text-sm text-[#ff8b8b]">{error}</p> : null}
    </form>
  );
}
