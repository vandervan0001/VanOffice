/**
 * Paperclip AI REST client.
 *
 * Communicates with a Paperclip sidecar process (default http://localhost:3100).
 * All functions are stateless HTTP calls — the executor handles orchestration.
 */

const PAPERCLIP_URL = process.env.PAPERCLIP_URL || "http://localhost:3100";

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
  description: string,
): Promise<{ id: string }> {
  return paperclipFetch("/api/companies", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

// ─── Agents ───

export async function createAgent(
  companyId: string,
  agent: {
    name: string;
    role: string;
    title: string;
    systemPrompt: string;
  },
): Promise<{ id: string }> {
  return paperclipFetch(`/api/companies/${companyId}/agents`, {
    method: "POST",
    body: JSON.stringify({
      name: agent.name,
      role: agent.role,
      title: agent.title,
      jobDescription: agent.systemPrompt,
      adapterType: "http",
      adapterConfig: {},
    }),
  });
}

// ─── Issues (Tasks) ───

export async function createIssue(
  companyId: string,
  issue: {
    title: string;
    description: string;
    assigneeId?: string;
    dependencies?: string[];
  },
): Promise<{ id: string }> {
  return paperclipFetch(`/api/companies/${companyId}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: issue.title,
      description: issue.description,
      assigneeId: issue.assigneeId,
      blockedBy: issue.dependencies,
    }),
  });
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
