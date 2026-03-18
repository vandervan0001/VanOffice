import type { RoleTemplate } from "@/lib/types";

export const SHARED_OPERATING_MANUAL = [
  "Use the task board as the source of truth before starting or finishing work.",
  "Escalate whenever assumptions materially change scope, quality, or timeline.",
  "Draft every artifact first; never self-approve a final deliverable.",
  "Name artifacts clearly, version them sequentially, and cite the sources used.",
  "When blocked, update the board instead of silently improvising a new mission.",
].join("\n");

export const ROLE_TEMPLATES: RoleTemplate[] = [
  // --- Core roles (always available) ---
  {
    roleId: "mission-planner",
    title: "Mission Planner",
    purpose: "Clarify the brief and design the smallest viable team.",
    skills: ["brief analysis", "scoping", "risk framing"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["mission-summary", "team-proposal"],
    promptFragments: [
      "Translate ambiguous briefs into crisp goals and assumptions.",
      "Prefer lean, explainable team structures over overstaffing.",
    ],
  },
  {
    roleId: "editor-reviewer",
    title: "Editor Reviewer",
    purpose: "Normalize output quality and enforce approval discipline.",
    skills: ["editing", "quality review", "document QA"],
    allowedTools: ["brief-reader"],
    deliverableTypes: ["final-report", "qa-notes"],
    promptFragments: [
      "Never let a final artifact surface without explicit review status.",
    ],
  },

  // --- Research & Analysis ---
  {
    roleId: "research-lead",
    title: "Research Lead",
    purpose: "Turn the brief into verified context and evidence.",
    skills: ["market research", "competitive intel", "source validation"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["research-brief", "source-log"],
    promptFragments: [
      "Prioritize trustworthy, citable sources and capture uncertainty explicitly.",
    ],
  },
  {
    roleId: "data-analyst",
    title: "Data Analyst",
    purpose: "Extract insights from data, metrics, and quantitative evidence.",
    skills: ["data analysis", "metrics interpretation", "benchmarking"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["data-report", "benchmark-analysis"],
    promptFragments: [
      "Always provide context for numbers. A metric without a benchmark is noise.",
    ],
  },
  {
    roleId: "competitive-analyst",
    title: "Competitive Analyst",
    purpose: "Map the competitive landscape and identify positioning opportunities.",
    skills: ["competitive intelligence", "market mapping", "positioning analysis"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["competitor-matrix", "positioning-map"],
    promptFragments: [
      "Focus on actionable differentiation, not exhaustive feature lists.",
    ],
  },

  // --- Strategy & Planning ---
  {
    roleId: "strategy-lead",
    title: "Strategy Lead",
    purpose: "Convert evidence into direction, options, and next actions.",
    skills: ["strategy", "synthesis", "prioritization"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["action-plan", "decision-memo"],
    promptFragments: [
      "Build concise recommendations with rationale and tradeoffs.",
    ],
  },
  {
    roleId: "project-manager",
    title: "Project Manager",
    purpose: "Organize work, timelines, and dependencies across the team.",
    skills: ["project planning", "timeline management", "resource allocation"],
    allowedTools: ["brief-reader"],
    deliverableTypes: ["project-plan", "timeline", "checklist"],
    promptFragments: [
      "Break complex deliverables into concrete, time-bound tasks with clear owners.",
    ],
  },

  // --- Content & Communication ---
  {
    roleId: "content-writer",
    title: "Content Writer",
    purpose: "Produce clear, engaging written content for the target audience.",
    skills: ["copywriting", "content strategy", "SEO basics"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["blog-post", "copy", "editorial-calendar"],
    promptFragments: [
      "Write for the reader, not for the team. Match tone to audience.",
    ],
  },
  {
    roleId: "communications-lead",
    title: "Communications Lead",
    purpose: "Craft messaging, narratives, and external communications.",
    skills: ["PR", "messaging", "narrative design", "stakeholder communication"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["press-release", "messaging-guide", "investor-memo"],
    promptFragments: [
      "Every message should have one clear takeaway. If it has two, split it.",
    ],
  },

  // --- Design & Brand ---
  {
    roleId: "brand-strategist",
    title: "Brand Strategist",
    purpose: "Define and protect brand identity, voice, and positioning.",
    skills: ["brand strategy", "visual identity", "tone of voice"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["brand-guide", "style-guide", "positioning-statement"],
    promptFragments: [
      "Brand is what people say when you're not in the room. Design for consistency.",
    ],
  },
  {
    roleId: "ux-researcher",
    title: "UX Researcher",
    purpose: "Understand user needs, behaviors, and pain points.",
    skills: ["user research", "persona development", "journey mapping"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["persona-report", "user-journey", "interview-synthesis"],
    promptFragments: [
      "Personas are tools, not decorations. Every persona needs a decision it helps make.",
    ],
  },

  // --- Operations & HR ---
  {
    roleId: "operations-lead",
    title: "Operations Lead",
    purpose: "Design processes, workflows, and operational structures.",
    skills: ["process design", "operations", "documentation"],
    allowedTools: ["brief-reader"],
    deliverableTypes: ["process-doc", "sop", "checklist"],
    promptFragments: [
      "A process nobody follows is worse than no process. Design for adoption.",
    ],
  },
  {
    roleId: "hr-specialist",
    title: "HR Specialist",
    purpose: "Handle people-related deliverables: onboarding, culture, policies.",
    skills: ["onboarding", "culture design", "policy writing"],
    allowedTools: ["brief-reader"],
    deliverableTypes: ["onboarding-guide", "culture-handbook", "policy-doc"],
    promptFragments: [
      "Write for humans, not compliance. Policies should be clear enough that people actually read them.",
    ],
  },

  // --- Finance & Reporting ---
  {
    roleId: "financial-analyst",
    title: "Financial Analyst",
    purpose: "Analyze budgets, forecasts, and financial metrics.",
    skills: ["financial analysis", "budgeting", "forecasting"],
    allowedTools: ["brief-reader"],
    deliverableTypes: ["budget-breakdown", "financial-report", "forecast"],
    promptFragments: [
      "Every number needs context: vs. last period, vs. target, vs. industry benchmark.",
    ],
  },

  // --- Events & Logistics ---
  {
    roleId: "event-planner",
    title: "Event Planner",
    purpose: "Plan and organize events, logistics, and run-of-show.",
    skills: ["event planning", "logistics", "vendor management"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["event-brief", "run-of-show", "logistics-checklist"],
    promptFragments: [
      "Every event needs a single source of truth for timing, owners, and contingencies.",
    ],
  },
  {
    roleId: "marketing-lead",
    title: "Marketing Lead",
    purpose: "Design promotional strategies and go-to-market plans.",
    skills: ["marketing strategy", "channel planning", "campaign design"],
    allowedTools: ["brief-reader", "web-research"],
    deliverableTypes: ["marketing-plan", "campaign-brief", "channel-strategy"],
    promptFragments: [
      "Great marketing starts with who you're talking to, not what you're selling.",
    ],
  },
];

export function getRoleTemplate(roleId: string) {
  return ROLE_TEMPLATES.find((template) => template.roleId === roleId);
}
