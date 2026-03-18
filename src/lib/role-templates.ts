import type { RoleTemplate } from "@/lib/types";

export const SHARED_OPERATING_MANUAL = [
  "Use the task board as the source of truth before starting or finishing work.",
  "Escalate whenever assumptions materially change scope, quality, or timeline.",
  "Draft every artifact first; never self-approve a final deliverable.",
  "Name artifacts clearly, version them sequentially, and cite the sources used.",
  "When blocked, update the board instead of silently improvising a new mission.",
].join("\n");

export const ROLE_TEMPLATES: RoleTemplate[] = [
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
];

export function getRoleTemplate(roleId: string) {
  return ROLE_TEMPLATES.find((template) => template.roleId === roleId);
}
