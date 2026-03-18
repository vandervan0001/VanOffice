"use client";

import { useEffect, useState } from "react";

import { OfficeView } from "@/components/office/office-view";
import { MissionComposer } from "@/components/composer/mission-composer";
import { ApprovalSidebar } from "@/components/sidebar/approval-sidebar";
import { ArtifactPanel } from "@/components/outputs/artifact-panel";
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

  // Pre-workspace: empty office with composer overlay
  if (!workspace) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="relative mx-auto max-w-[1200px] px-4 py-8">
          <OfficeView snapshot={null} />
          <MissionComposer providers={providers} onCreated={handleCreated} />
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

  // Active workspace: full-screen layout — office left 70%, sidebar right 30%
  return (
    <main className="h-screen overflow-hidden bg-[var(--background)]">
      <div
        className="workspace-grid grid h-full"
        style={{
          gridTemplateColumns: "1fr 320px",
          gridTemplateRows: "1fr auto",
        }}
      >
        {/* Left: Pixel Office — fills available height, no scroll */}
        <section
          className="overflow-hidden"
          style={{ gridColumn: "1", gridRow: "1" }}
        >
          <OfficeView snapshot={workspace} />
        </section>

        {/* Right sidebar — same height as office, scrolls internally */}
        <div
          className="overflow-y-auto border-l border-[var(--border)]"
          style={{ gridColumn: "2", gridRow: "1 / -1" }}
        >
          <ApprovalSidebar
            snapshot={workspace}
            busyGate={busyGate}
            onApprove={approve}
          />
        </div>

        {/* Bottom-left: Artifacts */}
        <div
          className="border-t border-[var(--border)]"
          style={{ gridColumn: "1", gridRow: "2" }}
        >
          <ArtifactPanel artifacts={workspace.artifacts} />
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
