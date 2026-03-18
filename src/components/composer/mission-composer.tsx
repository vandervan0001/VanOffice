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

interface DemoPreset {
  id: string;
  label: string;
  goal: string;
  outputs: string;
  brief: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "marketing",
    label: "Marketing Intelligence",
    goal: "Create a marketing intelligence packet",
    outputs: "Research brief, action plan, and a polished final packet",
    brief: [
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
    ].join("\n"),
  },
  {
    id: "content-strategy",
    label: "Content Strategy",
    goal: "Build a 3-month content strategy for a SaaS blog",
    outputs: "Audience persona report, editorial calendar, content guidelines document",
    brief: [
      "Context:",
      "We run a project management SaaS (B2B, 50-200 employee companies).",
      "Our blog gets ~2k visits/month but generates almost no leads.",
      "We have one part-time content writer and use WordPress.",
      "",
      "Mission:",
      "Design a focused content strategy that turns the blog into a lead generation channel within 3 months.",
      "",
      "Constraints:",
      "- Budget: $0 for paid tools (use free alternatives only).",
      "- Capacity: 2 blog posts per week maximum.",
      "- No video content for now, text only.",
      "",
      "Audience:",
      "Operations managers and team leads at mid-size companies who struggle with project visibility.",
      "",
      "Success criteria:",
      "- Clear persona document with pain points and search intent.",
      "- 12-week editorial calendar with topics, keywords, and CTAs.",
      "- Style guide and content brief template for the writer to follow.",
    ].join("\n"),
  },
  {
    id: "competitive-analysis",
    label: "Competitive Analysis",
    goal: "Map the competitive landscape for our product category",
    outputs: "Competitor matrix, positioning map, gap analysis report",
    brief: [
      "Context:",
      "We sell an AI-powered customer support tool for e-commerce brands.",
      "We know our top 3 competitors but lack a structured view of the landscape.",
      "Pricing page visits are high but conversion is low — we suspect positioning issues.",
      "",
      "Mission:",
      "Produce a comprehensive competitive analysis that reveals where we stand, where the gaps are, and how to differentiate.",
      "",
      "Constraints:",
      "- Focus on competitors targeting the same segment (SMB e-commerce, <500 employees).",
      "- Use only publicly available information (websites, reviews, press releases).",
      "- Deliver insights, not raw data dumps.",
      "",
      "Audience:",
      "CEO, Head of Product, and Head of Sales.",
      "",
      "Success criteria:",
      "- Feature comparison matrix across top 6-8 competitors.",
      "- Visual positioning map (price vs. capability or similar axes).",
      "- 3-5 actionable differentiation opportunities with rationale.",
    ].join("\n"),
  },
  {
    id: "onboarding-docs",
    label: "Employee Onboarding Pack",
    goal: "Create an employee onboarding documentation pack",
    outputs: "Welcome guide, 30/60/90 day plan template, culture handbook summary",
    brief: [
      "Context:",
      "We're a 15-person startup growing to 25 this year.",
      "Currently, onboarding is ad-hoc: new hires get a Slack invite and figure things out.",
      "Last 2 hires took 3+ weeks to become productive. We need structure.",
      "",
      "Mission:",
      "Build a lightweight but complete onboarding pack that gets new hires productive in under 2 weeks.",
      "",
      "Constraints:",
      "- Must work for both technical and non-technical roles.",
      "- Keep it under 15 pages total (people won't read more).",
      "- No HR jargon — keep the tone friendly and direct.",
      "",
      "Audience:",
      "New hires (developers, designers, ops) + their managers who run onboarding.",
      "",
      "Success criteria:",
      "- Day 1 welcome guide with practical setup steps.",
      "- 30/60/90 day milestone template adaptable per role.",
      "- One-page culture summary (values, how we work, communication norms).",
    ].join("\n"),
  },
  {
    id: "event-planning",
    label: "Event Planning Brief",
    goal: "Plan a product launch event (online + in-person)",
    outputs: "Event brief, run-of-show document, promotion plan, logistics checklist",
    brief: [
      "Context:",
      "We're launching v2 of our developer tool in 8 weeks.",
      "We want a hybrid event: a 2-hour live stream + a small in-person gathering (50 people) in Paris.",
      "Budget is limited (~5k EUR total).",
      "",
      "Mission:",
      "Produce a complete event planning pack that a small team can execute without an event agency.",
      "",
      "Constraints:",
      "- Total budget: 5,000 EUR (venue, catering, streaming setup, swag).",
      "- Team: 3 people available part-time for event prep.",
      "- Timeline: 8 weeks from brief to event day.",
      "- Must work for both remote attendees (stream) and in-person guests.",
      "",
      "Audience:",
      "Developer community, existing users, tech press (niche).",
      "",
      "Success criteria:",
      "- Complete run-of-show with timing, speakers, and transitions.",
      "- Promotion plan (channels, timeline, messaging).",
      "- Logistics checklist with owners and deadlines.",
      "- Budget breakdown showing it fits within 5k EUR.",
    ].join("\n"),
  },
  {
    id: "investor-report",
    label: "Investor Update Report",
    goal: "Write a quarterly investor update report",
    outputs: "Investor memo, KPI dashboard summary, next quarter priorities",
    brief: [
      "Context:",
      "We raised a seed round 6 months ago from 3 angel investors and 1 small fund.",
      "We've been sending informal updates over email but investors want more structure.",
      "Q1 numbers are solid: MRR grew 40%, but churn is a concern.",
      "",
      "Mission:",
      "Produce a professional quarterly investor update that builds confidence and surfaces the right questions.",
      "",
      "Constraints:",
      "- Keep it under 2 pages (investors are busy).",
      "- Be transparent about challenges (churn), not just wins.",
      "- Include specific asks if we need help (intros, advice, etc.).",
      "",
      "Audience:",
      "3 angel investors, 1 fund partner, and our advisory board.",
      "",
      "Success criteria:",
      "- Clean narrative: what happened, what we learned, what's next.",
      "- Key metrics with context (not just numbers — why they matter).",
      "- 2-3 specific asks for investors.",
      "- Professional but not corporate tone.",
    ].join("\n"),
  },
];

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

  function loadPreset(preset: DemoPreset) {
    setGoal(preset.goal);
    setOutputs(preset.outputs);
    setBrief(preset.brief);
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
          Describe your mission, or pick a template to get started.
        </p>

        {/* Preset selector */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadPreset(preset)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--success)] hover:text-[var(--foreground)]"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
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
                : "Attach a brief or supporting docs"}
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

        {error && (
          <p className="mt-3 text-sm text-[var(--attention)]">{error}</p>
        )}
      </form>
    </div>
  );
}
