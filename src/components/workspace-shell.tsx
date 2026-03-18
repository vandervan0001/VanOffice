"use client";

import { useEffect, useState } from "react";

import type { ProviderAdapter, WorkspaceSnapshot } from "@/lib/types";

interface WorkspaceShellProps {
  providers: Array<Pick<ProviderAdapter, "id" | "label"> & { configured: boolean }>;
}

async function fetchSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
  const res = await fetch(`/api/workspaces/${workspaceId}`);
  if (!res.ok) throw new Error("Unable to load workspace");
  return res.json() as Promise<WorkspaceSnapshot>;
}

export function WorkspaceShell({ providers }: WorkspaceShellProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [busyGate, setBusyGate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = workspace?.workspace.id;

  // Load workspace from URL param on mount
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("workspace");
    if (!id) return;
    fetchSnapshot(id)
      .then(setWorkspace)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  // SSE live updates
  useEffect(() => {
    if (!workspaceId) return;
    const es = new EventSource(`/api/workspaces/${workspaceId}/stream`);
    es.onmessage = (event) => {
      setWorkspace(JSON.parse(event.data) as WorkspaceSnapshot);
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

  // Before workspace exists: show empty office with composer overlay
  if (!workspace) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="relative mx-auto max-w-[1200px] px-4 py-8">
          {/* Empty office placeholder — replaced by OfficeView in Task 7 */}
          <div className="flex h-[448px] items-center justify-center rounded-xl bg-[#f0ebe3]">
            <span className="text-sm text-[var(--text-secondary)]">
              Office loading...
            </span>
          </div>
          {/* Composer overlay — replaced by MissionComposer in Task 8 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-white/90 p-8 shadow-sm backdrop-blur">
              <p className="text-[var(--text-secondary)]">
                Composer placeholder — Task 8
              </p>
            </div>
          </div>
        </div>
        {error && (
          <div className="mx-auto max-w-[1200px] px-4">
            <p className="mt-4 rounded-xl bg-[var(--attention-bg)] p-3 text-sm text-[var(--attention)]">
              {error}
            </p>
          </div>
        )}
      </main>
    );
  }

  // L-shaped layout: office + outputs left, sidebar right
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div
        className="workspace-grid mx-auto grid max-w-[1200px] gap-4 px-4 py-8"
        style={{
          gridTemplateColumns: "1fr 250px",
          gridTemplateRows: "auto 1fr",
        }}
      >
        {/* Top-left: Pixel Office */}
        <section
          className="rounded-xl bg-[#f0ebe3]"
          style={{ gridColumn: "1", gridRow: "1" }}
        >
          <div className="flex h-[448px] items-center justify-center">
            <span className="text-sm text-[var(--text-secondary)]">
              Office View — Task 7
            </span>
          </div>
        </section>

        {/* Right sidebar (spans both rows) */}
        <aside
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          style={{ gridColumn: "2", gridRow: "1 / -1" }}
        >
          {/* Approval gates placeholder */}
          <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Validations
          </p>
          <div className="mt-3 space-y-3">
            {workspace.approvals.map((gate) => (
              <div
                key={gate.gateType}
                className="rounded-xl border border-[var(--border)] p-3"
              >
                <p className="text-sm font-medium">
                  {gate.gateType.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {gate.status}
                </p>
                {gate.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => approve(gate.gateType)}
                    disabled={busyGate === gate.gateType}
                    className="mt-2 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {busyGate === gate.gateType ? "..." : "Valider"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Bottom-left: Outputs */}
        <section
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          style={{ gridColumn: "1", gridRow: "2" }}
        >
          <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Livrables
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {workspace.artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="min-w-[200px] rounded-xl border border-[var(--border)] p-3"
              >
                <p className="text-sm font-medium">{artifact.title}</p>
                <span className="text-xs text-[var(--text-secondary)]">
                  {artifact.status} · v{artifact.currentVersion}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {error && (
        <div className="mx-auto max-w-[1200px] px-4">
          <p className="mt-4 rounded-xl bg-[var(--attention-bg)] p-3 text-sm text-[var(--attention)]">
            {error}
          </p>
        </div>
      )}
    </main>
  );
}
