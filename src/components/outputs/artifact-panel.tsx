import type { ArtifactRecord } from "@/lib/types";
import { ArtifactCard } from "./artifact-card";

interface ArtifactPanelProps {
  artifacts: ArtifactRecord[];
}

export function ArtifactPanel({ artifacts }: ArtifactPanelProps) {
  if (artifacts.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
          Deliverables
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Artifacts will appear here once the team starts working.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        Deliverables
      </p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {artifacts.map((artifact) => (
          <ArtifactCard key={artifact.id} artifact={artifact} />
        ))}
      </div>
    </section>
  );
}
