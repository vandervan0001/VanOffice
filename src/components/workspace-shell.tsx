"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";
import { MissionComposer } from "@/components/composer/mission-composer";
import { ApprovalSidebar } from "@/components/sidebar/approval-sidebar";
import { ArtifactPanel } from "@/components/outputs/artifact-panel";
import { CommandInput } from "@/components/sidebar/command-input";
import type { ProviderAdapter, WorkspaceSnapshot, WorkspaceStatus } from "@/lib/types";

const CanvasOffice = dynamic(
  () =>
    import("@/components/office/canvas-office").then((m) => ({
      default: m.CanvasOffice,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
        Loading office...
      </div>
    ),
  },
);

interface RecentWorkspaceSummary {
  id: string;
  title: string;
  providerId: string;
  status: WorkspaceStatus;
  createdAt: number;
  updatedAt: number;
  missionGoal: string | null;
  teamSize: number;
}

interface WorkspaceShellProps {
  providers: Array<Pick<ProviderAdapter, "id" | "label"> & { configured: boolean }>;
}

async function fetchSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
  const res = await fetch(`/api/workspaces/${workspaceId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Unable to load workspace");
  }
  const data = await res.json() as WorkspaceSnapshot;
  // Guard against malformed responses missing the nested workspace object
  if (!data?.workspace?.id) {
    throw new Error("Invalid workspace data received");
  }
  return data;
}

function deriveSuggestions(snapshot: WorkspaceSnapshot | null): string[] {
  if (!snapshot?.workspace) return [];
  const status = snapshot.workspace.status;

  if (status === "awaiting_team_approval" || status === "awaiting_plan_approval") {
    const base = ["Start execution", "Adjust team composition", "Add constraints"];
    if (snapshot.expectedOutputs?.length > 0) {
      const outputSuggestions = snapshot.expectedOutputs.slice(0, 2).map(
        (output) => `Draft ${output.toLowerCase()}`
      );
      return [...base, ...outputSuggestions];
    }
    return base;
  }

  if (status === "running") {
    return ["Check progress", "Prioritize deliverables", "Request status update"];
  }

  if (status === "complete" || status === "awaiting_final_approval") {
    return ["Export all deliverables", "Start follow-up mission", "Generate executive summary"];
  }

  return [];
}

export function WorkspaceShell({ providers }: WorkspaceShellProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [busyGate, setBusyGate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paperclipStatus, setPaperclipStatus] = useState<"checking" | "online" | "offline">("checking");
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspaceSummary[]>([]);

  const workspaceId = workspace?.workspace.id;
  const suggestions = deriveSuggestions(workspace);

  // Check Paperclip availability on mount
  useEffect(() => {
    async function checkPaperclip() {
      try {
        const res = await fetch("/api/workspaces/paperclip-status");
        const data = await res.json() as { available: boolean };
        setPaperclipStatus(data.available ? "online" : "offline");
      } catch {
        setPaperclipStatus("offline");
      }
    }
    checkPaperclip();
    // Re-check every 30 seconds
    const interval = setInterval(checkPaperclip, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent workspaces when on composer screen
  useEffect(() => {
    if (workspace) return;
    async function loadRecent() {
      try {
        const res = await fetch("/api/workspaces");
        const data = await res.json() as { workspaces: RecentWorkspaceSummary[] };
        setRecentWorkspaces(data.workspaces ?? []);
      } catch {
        // Silently fail — not critical
      }
    }
    loadRecent();
  }, [workspace]);

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("workspace");
    if (!id) return;
    fetchSnapshot(id)
      .then(setWorkspace)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    const es = new EventSource(`/api/workspaces/${workspaceId}/stream`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WorkspaceSnapshot;
        if (data?.workspace?.id) {
          setWorkspace(data);
        }
      } catch {
        // Ignore malformed SSE messages
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [workspaceId]);

  async function approve(gateType: string) {
    if (!workspace) return;
    setBusyGate(gateType);
    try {
      const res = await fetch(
        `/api/workspaces/${workspace.workspace.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gateType }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Approval failed.");
        return;
      }
      setWorkspace(await res.json() as WorkspaceSnapshot);
    } finally {
      setBusyGate(null);
    }
  }

  function handleCreated(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", id);
    window.history.replaceState({}, "", url);
    fetchSnapshot(id)
      .then(setWorkspace)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }

  function handleNewTeam() {
    const url = new URL(window.location.href);
    url.searchParams.delete("workspace");
    window.history.replaceState({}, "", url);
    setWorkspace(null);
    setError(null);
  }

  function handleResume(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", id);
    window.history.replaceState({}, "", url);
    fetchSnapshot(id)
      .then(setWorkspace)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }

  // Status banner — no blocking Paperclip warnings, just provider info
  const paperclipBanner = paperclipStatus === "online" ? (
    <div className="mx-auto mb-3 max-w-[1600px]">
      <a href="http://localhost:3100/COM/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--success)] transition hover:bg-[var(--success)]/10">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
        Paperclip connected ↗
      </a>
    </div>
  ) : null;

  // Pre-workspace: composer only (no office background — cleaner)
  if (!workspace) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-4">
        {paperclipBanner}
        <div className="mx-auto max-w-xl py-12">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <MissionComposer providers={providers} onCreated={handleCreated} />
          </div>
        </div>
        {error && (
          <div className="mx-auto max-w-xl">
            <p className="mt-4 rounded-xl bg-[var(--attention-bg)] p-3 text-sm text-[var(--attention)]">
              {error}
            </p>
          </div>
        )}
        {recentWorkspaces.length > 0 && (
          <div className="mx-auto mt-8 max-w-xl">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Recent workspaces
            </h3>
            <div className="space-y-2">
              {recentWorkspaces.slice(0, 10).map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleResume(ws.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--foreground)]/20 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {ws.missionGoal || ws.title || "Untitled workspace"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {ws.teamSize > 0 ? `${ws.teamSize} agents` : "No team yet"}
                      {" · "}
                      {new Date(ws.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      ws.status === "running"
                        ? "bg-[var(--success-bg)] text-[var(--success)]"
                        : ws.status === "complete"
                          ? "bg-[var(--foreground)]/5 text-[var(--text-muted)]"
                          : "bg-[var(--attention-bg)] text-[var(--attention)]"
                    }`}
                  >
                    {ws.status === "running"
                      ? "Running"
                      : ws.status === "complete"
                        ? "Completed"
                        : ws.status === "drafting"
                          ? "Draft"
                          : ws.status.replace(/_/g, " ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    );
  }

  // Active workspace: 50/50 layout with margins
  return (
    <main className="min-h-screen bg-[var(--background)] p-4">
      {/* Top bar: New team + Paperclip status */}
      <div className="mx-auto mb-2 flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewTeam}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-secondary)] transition hover:border-[var(--foreground)]/30 hover:text-[var(--foreground)]"
          >
            ← New team
          </button>
          <span className="text-[10px] text-[var(--text-muted)]">Auto-saved</span>
        </div>
        {paperclipStatus === "online" && (
          <a href="http://localhost:3100/COM/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--success)] transition hover:bg-[var(--success)]/10">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Paperclip ↗
          </a>
        )}
        {paperclipStatus === "offline" && workspace.workspace.providerId !== "mock" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--success)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            {workspace.workspace.providerId === "gemini" ? "Gemini" : workspace.workspace.providerId === "openai" ? "OpenAI" : workspace.workspace.providerId === "anthropic" ? "Anthropic" : workspace.workspace.providerId}
          </span>
        )}
        {paperclipStatus === "offline" && workspace.workspace.providerId === "mock" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--attention)]/30 bg-[var(--attention-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--attention)]">
            Mock mode
          </span>
        )}
      </div>

      {/* Office + Sidebar — fixed height, fills viewport */}
      <div className="mx-auto flex max-w-[1600px] gap-3" style={{ height: "calc(100vh - 80px)" }}>
        {/* Office canvas — takes most of the space */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)]">
          <CanvasOffice snapshot={workspace} />
        </div>
        {/* Sidebar: validations + orders */}
        <div className="flex w-[320px] shrink-0 flex-col gap-3">
          <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <ApprovalSidebar
              snapshot={workspace}
              busyGate={busyGate}
              onApprove={approve}
            />
          </div>
          <div className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <CommandInput
              suggestions={suggestions}
              workspaceId={workspaceId}
              nextPendingGate={
                workspace?.approvals?.find((g) => g.status === "pending")?.gateType
              }
              onApprove={approve}
              onSnapshotUpdate={() => {
                if (workspaceId) {
                  fetchSnapshot(workspaceId)
                    .then(setWorkspace)
                    .catch(() => {});
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Deliverables — full width below, scrolls down */}
      <div className="mx-auto mt-3 max-w-[1600px]">
        <ArtifactPanel
          artifacts={workspace.artifacts}
          workspaceId={workspaceId}
          onSnapshotUpdate={() => {
            if (workspaceId) {
              fetchSnapshot(workspaceId)
                .then(setWorkspace)
                .catch(() => {});
            }
          }}
        />
      </div>

      {error && (
        <div className="fixed bottom-4 left-4 right-4">
          <p className="mx-auto max-w-lg rounded-xl bg-[var(--attention-bg)] p-3 text-center text-sm text-[var(--attention)]">
            {error}
          </p>
        </div>
      )}
    </main>
  );
}
