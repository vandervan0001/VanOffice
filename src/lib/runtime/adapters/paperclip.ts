/**
 * Paperclip AI REST client + CLI wrappers.
 *
 * Communicates with a Paperclip sidecar process (default http://localhost:3100).
 * REST calls for creation (POST), CLI for issue update/checkout (since REST PATCH
 * doesn't work for issues by UUID).
 */

import { execSync } from "node:child_process";

const PAPERCLIP_URL = process.env.PAPERCLIP_URL || "http://localhost:3100";
const PAPERCLIP_DATA_DIR = "/Volumes/Tai_SSD/dev/Projects/VanOffice/.paperclip-data";

// Cache availability check for 30 seconds
let availabilityCache: { result: boolean; expiry: number } | null = null;

async function paperclipFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAPERCLIP_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Paperclip ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Check if Paperclip sidecar is running and reachable.
 * Cached for 30 seconds to avoid hammering.
 */
export async function isPaperclipAvailable(): Promise<boolean> {
  const now = Date.now();
  if (availabilityCache && now < availabilityCache.expiry) {
    return availabilityCache.result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${PAPERCLIP_URL}/api/companies`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const result = res.ok;
    availabilityCache = { result, expiry: now + 30_000 };
    return result;
  } catch {
    availabilityCache = { result: false, expiry: now + 30_000 };
    return false;
  }
}

/** Invalidate the availability cache (e.g. after startup). */
export function resetAvailabilityCache() {
  availabilityCache = null;
}

// ─── Company ───

export async function createCompany(
  name: string,
  mission: string,
): Promise<{ id: string }> {
  return paperclipFetch("/api/companies", {
    method: "POST",
    body: JSON.stringify({ name, mission }),
  });
}

// ─── Agents ───

export async function createAgent(
  companyId: string,
  agent: {
    name: string;
    title: string;
    role?: string;
    systemPrompt?: string;
    adapterType?: string;
    adapterConfig?: Record<string, unknown>;
  },
): Promise<{ id: string }> {
  return paperclipFetch(`/api/companies/${companyId}/agents`, {
    method: "POST",
    body: JSON.stringify({
      name: agent.name,
      title: agent.title,
      role: agent.role,
      jobDescription: agent.systemPrompt,
      adapterType: agent.adapterType ?? "process",
      adapterConfig: agent.adapterConfig ?? {},
    }),
  });
}

export async function listAgents(
  companyId: string,
): Promise<Array<{ id: string; name: string; title?: string }>> {
  return paperclipFetch(`/api/companies/${companyId}/agents`);
}

// ─── Issues (Tasks) ───

export async function createIssue(
  companyId: string,
  issue: {
    title: string;
    body: string;
    priority?: "low" | "medium" | "high" | "critical";
    assigneeAgentId?: string;
    dependencies?: string[];
  },
): Promise<{ id: string }> {
  return paperclipFetch(`/api/companies/${companyId}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: issue.title,
      body: issue.body,
      priority: issue.priority ?? "medium",
    }),
  });
}

export async function listIssues(
  companyId: string,
): Promise<Array<{ id: string; title: string; status?: string }>> {
  return paperclipFetch(`/api/companies/${companyId}/issues`);
}

/**
 * Update an issue via CLI (REST PATCH doesn't work for issues by UUID).
 */
export function updateIssueCli(
  issueId: string,
  opts: {
    assigneeAgentId?: string;
    status?: "todo" | "in_progress" | "done";
  },
): void {
  const args = ["paperclipai", "issue", "update", issueId];

  if (opts.assigneeAgentId) {
    args.push("--assignee-agent-id", opts.assigneeAgentId);
  }
  if (opts.status) {
    args.push("--status", opts.status);
  }

  args.push("-d", PAPERCLIP_DATA_DIR);

  console.log(`[paperclip-cli] ${args.join(" ")}`);
  execSync(args.join(" "), { stdio: "pipe", timeout: 15_000 });
}

/**
 * Checkout an issue for an agent via CLI.
 */
export function checkoutIssueCli(
  issueId: string,
  agentId: string,
): void {
  const args = [
    "paperclipai", "issue", "checkout", issueId,
    "--agent-id", agentId,
    "-d", PAPERCLIP_DATA_DIR,
  ];

  console.log(`[paperclip-cli] ${args.join(" ")}`);
  execSync(args.join(" "), { stdio: "pipe", timeout: 15_000 });
}

// ─── Provider → Paperclip adapter mapping ───

const PROVIDER_ADAPTER_MAP: Record<string, {
  adapterType: string;
  envKeyName: string;
  modelEnvName?: string;
  defaultModel: string;
}> = {
  openai: {
    adapterType: "process",
    envKeyName: "OPENAI_API_KEY",
    modelEnvName: "OPENAI_MODEL",
    defaultModel: "gpt-4.1-mini",
  },
  anthropic: {
    adapterType: "claude_local",
    envKeyName: "ANTHROPIC_API_KEY",
    modelEnvName: "ANTHROPIC_MODEL",
    defaultModel: "claude-sonnet-4-6",
  },
  gemini: {
    adapterType: "process",
    envKeyName: "GEMINI_API_KEY",
    modelEnvName: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
  },
  ollama: {
    adapterType: "process",
    envKeyName: "OLLAMA_BASE_URL",
    modelEnvName: "OLLAMA_MODEL",
    defaultModel: "llama3.1",
  },
};

export function getAdapterConfigForProvider(providerId: string): {
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  envVars: Record<string, string>;
} {
  const mapping = PROVIDER_ADAPTER_MAP[providerId];
  if (!mapping) {
    return { adapterType: "process", adapterConfig: {}, envVars: {} };
  }

  const apiKey = process.env[mapping.envKeyName];
  const model = process.env[mapping.modelEnvName ?? ""] ?? mapping.defaultModel;

  const envVars: Record<string, string> = {};
  if (apiKey) envVars[mapping.envKeyName] = apiKey;
  if (model) envVars[mapping.modelEnvName ?? `${providerId.toUpperCase()}_MODEL`] = model;

  return {
    adapterType: mapping.adapterType,
    adapterConfig: {
      model,
      env: Object.fromEntries(
        Object.entries(envVars).map(([k, v]) => [k, v]),
      ),
    },
    envVars,
  };
}

// ─── Goals ───

export async function createGoal(
  companyId: string,
  goal: { title: string; description: string },
): Promise<{ id: string }> {
  return paperclipFetch(`/api/companies/${companyId}/goals`, {
    method: "POST",
    body: JSON.stringify(goal),
  });
}

// ─── Secrets (LLM API keys) ───

export async function setSecret(
  companyId: string,
  key: string,
  value: string,
): Promise<{ id: string }> {
  return paperclipFetch(`/api/companies/${companyId}/secrets`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

// ─── Activity Feed ───

export interface PaperclipActivity {
  id: string;
  type: string;
  agentId?: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export async function pollActivity(
  companyId: string,
  since?: string,
): Promise<PaperclipActivity[]> {
  const params = since ? `?since=${encodeURIComponent(since)}` : "";
  return paperclipFetch(`/api/companies/${companyId}/activity${params}`);
}

// ─── Approvals ───

export async function approveWorkflow(approvalId: string): Promise<void> {
  await paperclipFetch(`/api/approvals/${approvalId}/approve`, {
    method: "POST",
  });
}

// ─── ID Mapping ───

export interface PaperclipMapping {
  companyId: string;
  goalId?: string;
  /** Our agentId → Paperclip agentId */
  agentMap: Map<string, string>;
  /** Our taskId → Paperclip issueId */
  issueMap: Map<string, string>;
  /** Paperclip issueId → our taskId (reverse) */
  taskMap: Map<string, string>;
}
