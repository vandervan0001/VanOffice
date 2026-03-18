"use client";

import { useEffect, useState } from "react";

import { OfficeView } from "@/components/office/office-view";
import { MissionComposer } from "@/components/composer/mission-composer";
import { ApprovalSidebar } from "@/components/sidebar/approval-sidebar";
import { ArtifactPanel } from "@/components/outputs/artifact-panel";
import { CommandInput } from "@/components/sidebar/command-input";
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

  // Active workspace: 50/50 layout with margins
  // Left = office (top) + deliverables (bottom)
  // Right = validations card + chatbox card (separate)
  return (
    <main className="h-screen bg-[var(--background)] p-4">
      <div className="mx-auto flex h-full max-w-[1600px] gap-4">
        {/* LEFT COLUMN: office + deliverables */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Office */}
          <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[#e8d8c0]">
            <OfficeView snapshot={workspace} />
          </div>

          {/* Deliverables */}
          <div className="shrink-0">
            <ArtifactPanel artifacts={workspace.artifacts} />
          </div>
        </div>

        {/* RIGHT COLUMN: validations card + chatbox card */}
        <div className="flex w-[400px] shrink-0 flex-col gap-4">
          {/* Validations card — scrollable */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <ApprovalSidebar
              snapshot={workspace}
              busyGate={busyGate}
              onApprove={approve}
            />
          </div>

          {/* Chatbox card — separate */}
          <div className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <CommandInput />
          </div>
        </div>
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
