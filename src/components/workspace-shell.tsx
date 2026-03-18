"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MissionComposer } from "@/components/mission-composer";
import { projectWorkspaceState } from "@/lib/runtime/projector";
import type { ProviderAdapter, WorkspaceSnapshot } from "@/lib/types";

const OfficeScene = dynamic(
  () =>
    import("@/components/office-scene").then((module) => ({
      default: module.OfficeScene,
    })),
  { ssr: false },
);

interface WorkspaceShellProps {
  providers: Array<Pick<ProviderAdapter, "id" | "label"> & { configured: boolean }>;
}

async function getSnapshot(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}`);

  if (!response.ok) {
    throw new Error("Unable to load workspace");
  }

  return (await response.json()) as WorkspaceSnapshot;
}

export function WorkspaceShell({ providers }: WorkspaceShellProps) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [busyGate, setBusyGate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workspaceId = workspace?.workspace.id;

  useEffect(() => {
    const workspaceId = new URL(window.location.href).searchParams.get("workspace");
    if (!workspaceId) {
      return;
    }

    getSnapshot(workspaceId)
      .then(setWorkspace)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load workspace"));
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    const eventSource = new EventSource(`/api/workspaces/${workspaceId}/stream`);
    eventSource.onmessage = (event) => {
      const next = JSON.parse(event.data) as WorkspaceSnapshot;
      setWorkspace(next);
      setSelectedSequence((current) =>
        current === null || current >= next.events.length ? null : current,
      );
    };
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [workspaceId]);

  const replayed = useMemo(() => {
    if (!workspace) {
      return null;
    }

    if (selectedSequence === null) {
      return workspace;
    }

    return projectWorkspaceState(
      workspace.workspace,
      workspace.events,
      selectedSequence,
    );
  }, [selectedSequence, workspace]);

  const currentArtifact = useMemo(() => {
    if (!replayed) {
      return null;
    }

    return (
      replayed.artifacts.find((artifact) => artifact.id === selectedArtifactId) ??
      replayed.artifacts.at(-1) ??
      null
    );
  }, [replayed, selectedArtifactId]);

  async function approve(gateType: string) {
    if (!workspace) {
      return;
    }

    setBusyGate(gateType);
    const response = await fetch(`/api/workspaces/${workspace.workspace.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateType }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Approval failed.");
      setBusyGate(null);
      return;
    }

    const next = (await response.json()) as WorkspaceSnapshot;
    setWorkspace(next);
    setBusyGate(null);
  }

  function handleCreated(workspaceId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", workspaceId);
    window.history.replaceState({}, "", url);
    getSnapshot(workspaceId)
      .then(setWorkspace)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load workspace"));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(242,193,78,0.18),_transparent_30%),linear-gradient(160deg,#101217_0%,#151822_55%,#111315_100%)] px-4 py-8 text-white md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.36em] text-[#f2c14e]">
            Team Foundry v1
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-[#f8f4e9] md:text-5xl">
                Truthful pixel teams for knowledge work.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d2ccbf]">
                Brief a mission, approve the squad, and watch a document-first AI
                team move through real execution states instead of fake ambient
                animation.
              </p>
            </div>
            {workspace ? (
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#d7d0c2]">
                {workspace.workspace.status.replaceAll("_", " ")}
              </div>
            ) : null}
          </div>
        </header>

        {!workspace ? (
          <MissionComposer providers={providers} onCreated={handleCreated} />
        ) : replayed ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
            <section className="grid gap-4">
              <OfficeScene snapshot={replayed} />
              <div className="grid gap-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-[#f2c14e]">
                      Replay
                    </p>
                    <h2 className="text-xl font-semibold text-[#f8f4e9]">
                      {workspace.workspace.title}
                    </h2>
                  </div>
                  <button
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#d8d3c6] transition hover:border-[#f2c14e]"
                    onClick={() => setSelectedSequence(null)}
                    type="button"
                  >
                    Follow live
                  </button>
                </div>
                <input
                  type="range"
                  min={workspace.events[0]?.sequence ?? 0}
                  max={workspace.events.at(-1)?.sequence ?? 0}
                  value={selectedSequence ?? workspace.events.at(-1)?.sequence ?? 0}
                  onChange={(event) => setSelectedSequence(Number(event.target.value))}
                  className="accent-[#f2c14e]"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#12151a] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8f9eb9]">
                      Mission summary
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#ece6d7]">
                      {replayed.summary}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#12151a] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8f9eb9]">
                      Assumptions
                    </p>
                    <ul className="mt-3 grid gap-2 text-sm text-[#ece6d7]">
                      {replayed.assumptions.map((assumption) => (
                        <li key={assumption} className="rounded-xl bg-white/5 px-3 py-2">
                          {assumption}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#f2c14e]">
                      Team + task board
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[#f8f4e9]">
                      {replayed.teamProposal?.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {replayed.agents.map((agent) => (
                    <div
                      key={agent.agentId}
                      className="rounded-[22px] border border-white/10 bg-[#11151a] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#f8f4e9]">
                            {agent.displayName}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#8f9eb9]">
                            {agent.title}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#d7d0c2]">
                          {agent.state}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#d8d3c6]">
                        {agent.rationale}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  {replayed.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[22px] border border-white/10 bg-[#11151a] p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#f8f4e9]">
                            {task.title}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[#8f9eb9]">
                            {task.workType}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#d7d0c2]">
                          {task.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#d8d3c6]">
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#f2c14e]">
                  Approvals
                </p>
                <div className="mt-4 grid gap-3">
                  {workspace.approvals.map((approval) => (
                    <div
                      key={approval.gateType}
                      className="rounded-[22px] border border-white/10 bg-[#11151a] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#f8f4e9]">
                            {approval.gateType.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-sm text-[#cfc9ba]">
                            {approval.message}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#d7d0c2]">
                          {approval.status}
                        </span>
                      </div>
                      {approval.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => approve(approval.gateType)}
                          disabled={busyGate === approval.gateType}
                          className="mt-4 rounded-2xl bg-[#f2c14e] px-4 py-2 text-sm font-semibold text-[#1b1508] transition hover:bg-[#ffd86f] disabled:cursor-wait disabled:opacity-70"
                        >
                          {busyGate === approval.gateType ? "Approving..." : "Approve"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#f2c14e]">
                  Outputs
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {replayed.artifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      type="button"
                      onClick={() => setSelectedArtifactId(artifact.id)}
                      className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] transition ${
                        artifact.id === currentArtifact?.id
                          ? "border-[#f2c14e] bg-[#f2c14e]/15 text-[#f8f4e9]"
                          : "border-white/10 bg-white/5 text-[#d7d0c2] hover:border-white/25"
                      }`}
                    >
                      {artifact.title}
                    </button>
                  ))}
                </div>

                {currentArtifact ? (
                  <div className="mt-4 rounded-[24px] border border-white/10 bg-[#11151a] p-5">
                    <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-[#f8f4e9]">
                          {currentArtifact.title}
                        </h3>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-[#d7d0c2]">
                          {currentArtifact.status}
                        </span>
                      </div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8f9eb9]">
                        v{currentArtifact.currentVersion} · {currentArtifact.schema}
                      </p>
                    </div>
                    <article className="prose prose-invert mt-4 max-w-none prose-headings:text-[#f8f4e9] prose-p:text-[#d7d0c2] prose-strong:text-white prose-li:text-[#d7d0c2]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {
                          currentArtifact.versions.find(
                            (version) => version.version === currentArtifact.currentVersion,
                          )?.content
                        }
                      </ReactMarkdown>
                    </article>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#f2c14e]">
                  Event log
                </p>
                <div className="mt-4 grid max-h-[420px] gap-2 overflow-auto">
                  {workspace.events
                    .slice()
                    .reverse()
                    .map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-white/10 bg-[#11151a] px-3 py-2"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-[#8f9eb9]">
                          #{event.sequence} · {event.type}
                        </p>
                        <pre className="mt-2 overflow-auto text-xs leading-5 text-[#d7d0c2]">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#7c2d12] bg-[#2a160f] px-4 py-3 text-sm text-[#ffd4c6]">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
