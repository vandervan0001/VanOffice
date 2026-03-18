# Pixel Office UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PixiJS dark UI with a warm HTML/CSS pixel-art office in GBA 3/4 view, keeping the backend intact.

**Architecture:** Pure HTML/CSS renderer using CSS Grid for the office, absolute-positioned sprite `<img>` elements for agents, CSS transitions for movement. L-shaped layout: office top-left, artifact cards bottom, approval sidebar right. All runtime/DB/API code untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, LPC pixel-art sprites (no PixiJS, no Phaser).

**Spec:** `docs/superpowers/specs/2026-03-18-pixel-office-ui-redesign.md`

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/lib/state/office-layout.ts` | Pure function: agentIndex + AgentState → grid position. Desk assignments. |
| `src/components/office/office-view.tsx` | CSS Grid container, tile background, furniture placement, agent orchestration |
| `src/components/office/agent-sprite.tsx` | Single agent: sprite img + state bubble + name label, CSS transition movement |
| `src/components/office/furniture.tsx` | Static furniture components (desk, plant, coffee machine, whiteboard) |
| `src/components/office/meeting-bubble.tsx` | Speech bubble overlay above meeting table when 2+ agents gather |
| `src/components/outputs/artifact-panel.tsx` | Horizontal scrollable strip of artifact cards below the office |
| `src/components/outputs/artifact-card.tsx` | Single artifact card: title, status badge, version, preview, expand |
| `src/components/sidebar/approval-sidebar.tsx` | Right sidebar with stacked approval gate cards |
| `src/components/sidebar/approval-gate-card.tsx` | Single gate card: pending/approved/future states with expandable details |
| `src/components/sidebar/command-input.tsx` | Disabled v1 text input placeholder for v2 chat |
| `tests/office-layout.test.ts` | Unit tests for grid position mapping |
| `tests/approval-sidebar.test.tsx` | Gate rendering and button interaction tests |
| `tests/artifact-panel.test.tsx` | Card rendering, status badges, expand behavior tests |
| `tests/workspace-shell.test.tsx` | L-shaped layout renders, composer overlay, component wiring |

### Files to Rewrite

| File | What Changes |
|------|-------------|
| `src/components/workspace-shell.tsx` | Complete rewrite: L-shaped CSS Grid layout, wire up new subcomponents |
| `src/components/mission-composer.tsx` | Rewrite as overlay on empty office, warm theme, 3 fields only |
| `src/app/globals.css` | Dark theme → cream/warm palette |
| `src/app/page.tsx` | Simplified, just renders WorkspaceShell |
| `src/app/layout.tsx` | Update metadata text |

### Files to Delete

| File | Reason |
|------|--------|
| `src/components/office-scene.tsx` | Replaced by `office/office-view.tsx` |
| `src/lib/state/office.ts` | Replaced by `office-layout.ts` |
| `src/components/mission-composer.tsx` | Moved to `src/components/composer/mission-composer.tsx` |

### Dependencies to Remove

- `pixi.js` — no longer used
- `@pixi/react` — no longer used

### Tests to Update

| File | What Changes |
|------|-------------|
| `tests/office-state.test.ts` | Rewrite: test new `agentGridPosition` instead of `deriveAgentPlacements` |
| `tests/office-scene.test.tsx` | Delete (PixiJS-specific cleanup tests, no longer relevant) |

### Tests That Must Keep Passing (no changes)

- `tests/projector.test.ts`
- `tests/artifact-provenance.test.ts`
- `tests/role-templates.test.ts`

---

## Chunk 1: Foundation — Theme, Dependencies, Layout Shell

### Task 1: Remove PixiJS dependencies and old files

**Files:**
- Delete: `src/components/office-scene.tsx`
- Delete: `src/lib/state/office.ts`
- Delete: `tests/office-scene.test.tsx`
- Modify: `package.json`

- [ ] **Step 1: Remove PixiJS packages**

```bash
npm uninstall pixi.js @pixi/react
```

- [ ] **Step 2: Delete old PixiJS renderer and office state**

```bash
rm src/components/office-scene.tsx src/lib/state/office.ts tests/office-scene.test.tsx
```

- [ ] **Step 3: Verify existing backend tests still pass**

Run: `npm test`
Expected: `projector.test.ts`, `artifact-provenance.test.ts`, `role-templates.test.ts` PASS. `office-state.test.ts` FAILS (expected — imports deleted file). That's fine, we rewrite it in Task 3.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: remove PixiJS dependencies and old renderer"
```

---

### Task 2: Rewrite globals.css to warm cream theme

**Files:**
- Rewrite: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite globals.css**

```css
@import "tailwindcss";

:root {
  --background: #faf8f5;
  --foreground: #3a3630;
  --surface: #ffffff;
  --border: #e8e2d8;
  --text-secondary: #8a7a6a;
  --text-muted: #b8a898;
  --success: #5a8a6a;
  --success-bg: #f0faf0;
  --pending: #c49a3c;
  --pending-bg: #fff8e8;
  --attention: #c47a5a;
  --attention-bg: #fff5f0;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-bricolage);
  --font-mono: var(--font-ibm-plex-mono);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-bricolage), sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

::selection {
  background: rgba(90, 138, 106, 0.25);
  color: #1a1a1a;
}
```

- [ ] **Step 2: Update layout.tsx metadata**

In `src/app/layout.tsx`, change metadata description:

```typescript
export const metadata: Metadata = {
  title: "Team Foundry",
  description: "Create AI teams and watch them work in a pixel office.",
};
```

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds (some component imports will be broken but the CSS/layout compiles).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx && git commit -m "style: switch to warm cream theme"
```

---

### Task 3: Create office-layout.ts with tests (TDD)

**Files:**
- Create: `src/lib/state/office-layout.ts`
- Rewrite: `tests/office-state.test.ts` → rename to `tests/office-layout.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/office-layout.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  agentGridPosition,
  DESK_SLOTS,
  MEETING_SEATS,
  type GridPosition,
} from "@/lib/state/office-layout";
import type { AgentState } from "@/lib/types";

describe("agentGridPosition", () => {
  it("returns the assigned desk for idle state", () => {
    const pos = agentGridPosition(0, "idle");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[0]);
  });

  it("returns the assigned desk for planning state", () => {
    const pos = agentGridPosition(1, "planning");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[1]);
  });

  it("returns the assigned desk for writing state", () => {
    const pos = agentGridPosition(2, "writing");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[2]);
  });

  it("returns the assigned desk for researching state", () => {
    const pos = agentGridPosition(0, "researching");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[0]);
  });

  it("returns a meeting seat for meeting state", () => {
    const pos = agentGridPosition(0, "meeting");
    expect(pos.zone).toBe("meeting");
    expect(pos).toEqual(MEETING_SEATS[0]);
  });

  it("returns the assigned desk for waiting_for_approval", () => {
    const pos = agentGridPosition(3, "waiting_for_approval");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[3]);
  });

  it("returns the assigned desk for done state", () => {
    const pos = agentGridPosition(0, "done");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[0]);
  });

  it("wraps desk assignment for agents beyond slot count", () => {
    const pos = agentGridPosition(5, "idle");
    expect(pos.zone).toBe("desk");
    expect(pos).toEqual(DESK_SLOTS[5 % DESK_SLOTS.length]);
  });

  it("wraps meeting seat for agents beyond seat count", () => {
    const pos = agentGridPosition(4, "meeting");
    expect(pos.zone).toBe("meeting");
    expect(pos).toEqual(MEETING_SEATS[4 % MEETING_SEATS.length]);
  });

  it("covers all 7 AgentState values", () => {
    const states: AgentState[] = [
      "idle", "planning", "researching", "writing",
      "meeting", "waiting_for_approval", "done",
    ];
    for (const state of states) {
      const pos = agentGridPosition(0, state);
      expect(pos).toHaveProperty("row");
      expect(pos).toHaveProperty("col");
      expect(pos).toHaveProperty("zone");
    }
  });
});
```

- [ ] **Step 2: Delete old test file**

```bash
rm tests/office-state.test.ts
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/office-layout.test.ts`
Expected: FAIL — module `@/lib/state/office-layout` not found.

- [ ] **Step 4: Implement office-layout.ts**

Create `src/lib/state/office-layout.ts`:

```typescript
import type { AgentState } from "@/lib/types";

export interface GridPosition {
  row: number;
  col: number;
  zone: "desk" | "meeting";
}

// Desk positions in the office grid (row, col).
// 5 desks arranged in 2 rows of the workspace zone.
export const DESK_SLOTS: GridPosition[] = [
  { row: 4, col: 3, zone: "desk" },   // Desk 1: top-left
  { row: 4, col: 8, zone: "desk" },   // Desk 2: top-center
  { row: 4, col: 13, zone: "desk" },  // Desk 3: top-right
  { row: 7, col: 3, zone: "desk" },   // Desk 4: bottom-left
  { row: 7, col: 8, zone: "desk" },   // Desk 5: bottom-center
];

// Meeting room seats around the conference table.
export const MEETING_SEATS: GridPosition[] = [
  { row: 10, col: 7, zone: "meeting" },
  { row: 10, col: 11, zone: "meeting" },
  { row: 12, col: 7, zone: "meeting" },
  { row: 12, col: 11, zone: "meeting" },
];

const DESK_STATES: AgentState[] = [
  "idle", "planning", "researching", "writing",
  "waiting_for_approval", "done",
];

export function agentGridPosition(
  agentIndex: number,
  agentState: AgentState,
): GridPosition {
  if (agentState === "meeting") {
    return MEETING_SEATS[agentIndex % MEETING_SEATS.length];
  }
  // All other states: agent stays at their assigned desk.
  return DESK_SLOTS[agentIndex % DESK_SLOTS.length];
}

// State → bubble icon mapping for the UI layer.
export const STATE_BUBBLES: Record<AgentState, string | null> = {
  idle: null,
  planning: "notepad",
  researching: "search",
  writing: "pencil",
  meeting: "speech",
  waiting_for_approval: "clock",
  done: "checkmark",
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/office-layout.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 6: Run all tests to check nothing else broke**

Run: `npm test`
Expected: `office-layout`, `projector`, `artifact-provenance`, `role-templates` all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/state/office-layout.ts tests/office-layout.test.ts && git commit -m "feat: add office grid layout logic with tests"
```

---

### Task 4: Create placeholder sprite assets

**Files:**
- Create: `public/sprites/bubbles/` (6 SVG files)
- Create: `public/sprites/agents/` (placeholder)

We use inline SVGs for state bubbles and CSS-drawn placeholders for agents/furniture. Real LPC sprites can be swapped in later without code changes.

- [ ] **Step 1: Create bubble SVG icons**

Create `public/sprites/bubbles/search.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="10" cy="10" r="6" fill="none" stroke="#3a3630" stroke-width="2"/><line x1="14.5" y1="14.5" x2="20" y2="20" stroke="#3a3630" stroke-width="2" stroke-linecap="round"/></svg>
```

Create `public/sprites/bubbles/clock.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9" fill="none" stroke="#c49a3c" stroke-width="2"/><line x1="12" y1="7" x2="12" y2="12" stroke="#c49a3c" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="12" x2="16" y2="12" stroke="#c49a3c" stroke-width="2" stroke-linecap="round"/></svg>
```

Create `public/sprites/bubbles/checkmark.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M4 12l6 6L20 6" fill="none" stroke="#5a8a6a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

Create `public/sprites/bubbles/pencil.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M16 3l5 5-12 12H4v-5L16 3z" fill="none" stroke="#3a3630" stroke-width="2" stroke-linejoin="round"/></svg>
```

Create `public/sprites/bubbles/notepad.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="#3a3630" stroke-width="2"/><line x1="9" y1="8" x2="15" y2="8" stroke="#3a3630" stroke-width="1.5"/><line x1="9" y1="12" x2="15" y2="12" stroke="#3a3630" stroke-width="1.5"/><line x1="9" y1="16" x2="13" y2="16" stroke="#3a3630" stroke-width="1.5"/></svg>
```

Create `public/sprites/bubbles/speech.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z" fill="none" stroke="#3a3630" stroke-width="2"/><circle cx="9" cy="11" r="1" fill="#3a3630"/><circle cx="12" cy="11" r="1" fill="#3a3630"/><circle cx="15" cy="11" r="1" fill="#3a3630"/></svg>
```

- [ ] **Step 2: Commit**

```bash
git add public/sprites/ && git commit -m "assets: add SVG bubble icons for agent states"
```

---

### Task 5: Create workspace-shell.tsx with L-shaped layout

**Files:**
- Rewrite: `src/components/workspace-shell.tsx`

This is a structural shell only — it imports placeholder `<div>`s for the three zones. Actual subcomponents come in later tasks.

- [ ] **Step 1: Rewrite workspace-shell.tsx**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
        className="mx-auto grid max-w-[1200px] gap-4 px-4 py-8"
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
```

- [ ] **Step 2: Simplify page.tsx**

The current `page.tsx` is already minimal. Just keep it as-is — it already passes providers to WorkspaceShell.

- [ ] **Step 3: Verify the app builds and renders**

Run: `npm run dev`
Expected: App starts. Homepage shows the L-shaped layout with placeholder zones. No PixiJS errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace-shell.tsx && git commit -m "feat: L-shaped workspace shell with warm theme"
```

---

## Chunk 2: Office Renderer — Sprites, Furniture, Agent Movement

### Task 6: Create agent-sprite.tsx component

**Files:**
- Create: `src/components/office/agent-sprite.tsx`

- [ ] **Step 1: Create agent-sprite.tsx**

```tsx
import Image from "next/image";

import type { AgentState } from "@/lib/types";
import { STATE_BUBBLES } from "@/lib/state/office-layout";

interface AgentSpriteProps {
  displayName: string;
  state: AgentState;
  row: number;
  col: number;
  color: string; // CSS color for the agent token fallback
  entryDelay?: number; // ms delay for staggered entry animation
}

const CELL_SIZE = 32;

export function AgentSprite({
  displayName,
  state,
  row,
  col,
  color,
  entryDelay = 0,
}: AgentSpriteProps) {
  const bubble = STATE_BUBBLES[state];
  const top = row * CELL_SIZE;
  const left = col * CELL_SIZE;

  return (
    <div
      className="agent-enter absolute flex flex-col items-center"
      style={{
        top,
        left,
        width: CELL_SIZE * 2,
        transition: "top 0.8s ease-in-out, left 0.8s ease-in-out",
        animationDelay: `${entryDelay}ms`,
      }}
    >
      {/* State bubble */}
      {bubble && (
        <div className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm">
          <Image
            src={`/sprites/bubbles/${bubble}.svg`}
            alt={bubble}
            width={16}
            height={16}
          />
        </div>
      )}

      {/* Agent body — CSS fallback, swap for LPC sprite later */}
      <div
        className="flex h-10 w-8 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {displayName.slice(0, 2).toUpperCase()}
      </div>

      {/* Name label */}
      <span className="mt-0.5 text-[9px] font-medium text-[var(--foreground)]">
        {displayName}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/office/agent-sprite.tsx && git commit -m "feat: agent sprite component with state bubbles"
```

---

### Task 7: Create furniture.tsx and office-view.tsx

**Files:**
- Create: `src/components/office/furniture.tsx`
- Create: `src/components/office/meeting-bubble.tsx`
- Create: `src/components/office/office-view.tsx`

- [ ] **Step 1: Create furniture.tsx**

```tsx
const CELL = 32;

interface FurnitureProps {
  type: "desk" | "plant" | "coffee" | "whiteboard" | "meeting-table" | "window" | "clock" | "poster";
  row: number;
  col: number;
}

const FURNITURE_STYLES: Record<FurnitureProps["type"], {
  w: number; h: number; bg: string; label: string; radius?: string;
}> = {
  desk: { w: 3, h: 2, bg: "#c4a46c", label: "Bureau", radius: "4px" },
  plant: { w: 1, h: 1, bg: "#6aaa5a", label: "🌿", radius: "50%" },
  coffee: { w: 1, h: 2, bg: "#8a6a4a", label: "☕", radius: "4px" },
  whiteboard: { w: 3, h: 1, bg: "#f0ebe3", label: "Task Board", radius: "2px" },
  "meeting-table": { w: 4, h: 2, bg: "#b8956a", label: "", radius: "8px" },
  window: { w: 2, h: 1, bg: "#d4eaf7", label: "", radius: "2px" },
  clock: { w: 1, h: 1, bg: "#f0ebe3", label: "🕐", radius: "50%" },
  poster: { w: 1, h: 1, bg: "#e8d8c4", label: "📋", radius: "2px" },
};

export function Furniture({ type, row, col }: FurnitureProps) {
  const style = FURNITURE_STYLES[type];

  return (
    <div
      className="absolute flex items-center justify-center text-xs"
      style={{
        top: row * CELL,
        left: col * CELL,
        width: style.w * CELL,
        height: style.h * CELL,
        backgroundColor: style.bg,
        borderRadius: style.radius,
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {style.label && (
        <span className="text-[9px] text-[#5a4a3a] opacity-70">
          {style.label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create meeting-bubble.tsx**

```tsx
interface MeetingBubbleProps {
  title: string;
  row: number;
  col: number;
}

const CELL = 32;

export function MeetingBubble({ title, row, col }: MeetingBubbleProps) {
  return (
    <div
      className="absolute z-10 -translate-y-full rounded-lg bg-white/95 px-2 py-1 shadow-sm"
      style={{
        top: row * CELL - 8,
        left: col * CELL,
      }}
    >
      <span className="text-[10px] font-medium text-[var(--foreground)]">
        {title}
      </span>
      {/* Triangle pointer */}
      <div
        className="absolute left-4 top-full h-0 w-0"
        style={{
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgba(255,255,255,0.95)",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create office-view.tsx**

```tsx
import type { WorkspaceSnapshot } from "@/lib/types";
import { agentGridPosition } from "@/lib/state/office-layout";
import { AgentSprite } from "./agent-sprite";
import { Furniture } from "./furniture";
import { MeetingBubble } from "./meeting-bubble";

interface OfficeViewProps {
  snapshot: WorkspaceSnapshot | null;
}

const COLS = 22;
const ROWS = 14;
const CELL = 32;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;

// Agent display colors (warm, distinct, friendly)
const AGENT_COLORS = ["#4a90d9", "#d97a4a", "#5aaa6a", "#9a6abd", "#d9a04a"];

export function OfficeView({ snapshot }: OfficeViewProps) {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-xl"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {/* Floor: warm parquet */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#e8d8c0",
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px), repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.03) 31px, rgba(0,0,0,0.03) 32px)",
        }}
      />

      {/* Back wall (rows 0-2) */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: CELL * 2.5,
          backgroundColor: "#f0ebe3",
          borderBottom: "3px solid #c4b498",
        }}
      />

      {/* Wall furniture */}
      <Furniture type="window" row={0.5} col={2} />
      <Furniture type="window" row={0.5} col={6} />
      <Furniture type="window" row={0.5} col={11} />
      <Furniture type="clock" row={0.5} col={16} />
      <Furniture type="poster" row={0.5} col={19} />

      {/* Desks */}
      <Furniture type="desk" row={3} col={2} />
      <Furniture type="desk" row={3} col={7} />
      <Furniture type="desk" row={3} col={12} />
      <Furniture type="desk" row={6} col={2} />
      <Furniture type="desk" row={6} col={7} />

      {/* Decorations */}
      <Furniture type="coffee" row={3} col={19} />
      <Furniture type="plant" row={6} col={15} />
      <Furniture type="plant" row={12} col={19} />
      <Furniture type="whiteboard" row={8.5} col={15} />

      {/* Meeting room */}
      <Furniture type="meeting-table" row={10} col={7} />

      {/* Meeting room subtle floor tint */}
      <div
        className="absolute rounded-lg"
        style={{
          top: CELL * 9,
          left: CELL * 5,
          width: CELL * 8,
          height: CELL * 4.5,
          backgroundColor: "rgba(180, 160, 130, 0.15)",
          border: "1px dashed rgba(0,0,0,0.06)",
        }}
      />

      {/* Agents — staggered entry: 500ms between each */}
      {snapshot?.agents.map((agent, index) => {
        const pos = agentGridPosition(index, agent.state);
        return (
          <AgentSprite
            key={agent.agentId}
            displayName={agent.displayName}
            state={agent.state}
            row={pos.row}
            col={pos.col}
            color={AGENT_COLORS[index % AGENT_COLORS.length]}
            entryDelay={index * 500}
          />
        );
      })}

      {/* Meeting bubble */}
      {snapshot?.activeMeeting && (
        <MeetingBubble
          title={snapshot.activeMeeting.title}
          row={9}
          col={8}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/office/ && git commit -m "feat: pixel office renderer with furniture, agents, and meeting bubbles"
```

---

### Task 8: Rewrite mission-composer.tsx as overlay

**Files:**
- Rewrite: `src/components/mission-composer.tsx` → move to `src/components/composer/mission-composer.tsx`

- [ ] **Step 1: Create the new composer**

Create `src/components/composer/mission-composer.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

interface ProviderOption {
  id: string;
  label: string;
  configured: boolean;
}

interface MissionComposerProps {
  providers: ProviderOption[];
  onCreated: (workspaceId: string) => void;
}

const DEMO_GOAL = "Create a marketing intelligence packet";
const DEMO_OUTPUTS = "Research brief, action plan, and a polished final packet";
const DEMO_BRIEF = [
  "Context:",
  "We are launching a B2B AI operations tool for small agencies in Europe.",
  "Current traction is weak because messaging is generic and positioning is unclear.",
  "",
  "Mission:",
  "Build a clear market intelligence packet to sharpen positioning and go-to-market moves for the next 6 weeks.",
  "",
  "Constraints:",
  "- Keep recommendations realistic for a 2-person founding team.",
  "- Prioritize actions that can be executed within 10 business days.",
  "- Avoid assumptions that require paid enterprise data sources.",
  "",
  "Audience:",
  "Founders, growth lead, and one freelance content operator.",
  "",
  "Success criteria:",
  "- One concise market snapshot.",
  "- One ranked action plan with rationale.",
  "- One final synthesis packet ready for internal review and execution kickoff.",
].join("\n");

export function MissionComposer({ providers, onCreated }: MissionComposerProps) {
  const defaultProvider = useMemo(
    () => providers.find((p) => p.configured)?.id ?? providers[0]?.id ?? "mock",
    [providers],
  );
  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [outputs, setOutputs] = useState("");
  const [providerId, setProviderId] = useState(defaultProvider);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadDemo() {
    setGoal(DEMO_GOAL);
    setOutputs(DEMO_OUTPUTS);
    setBrief(DEMO_BRIEF);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData();
    fd.set("rawBrief", brief);
    fd.set("missionGoal", goal);
    fd.set("outputExpectations", outputs);
    fd.set("providerId", providerId);
    files.forEach((f) => fd.append("files", f));

    try {
      const res = await fetch("/api/workspaces", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to create workspace.");
        return;
      }
      const { workspaceId } = await res.json() as { workspaceId: string };
      onCreated(workspaceId);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--background)]/60 backdrop-blur-sm" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          Create your team
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Describe your mission, and we'll propose the right team.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Mission goal
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--success)]"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Build a competitive analysis for our product launch"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Expected outputs
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--success)]"
              value={outputs}
              onChange={(e) => setOutputs(e.target.value)}
              placeholder="e.g. Research brief, action plan, final report"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Mission brief
            </span>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-[var(--success)]"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe context, constraints, audience, and success criteria..."
              required
            />
          </label>

          {/* File drop */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {files.length > 0
                ? `${files.length} file(s) attached`
                : "📎 Attach a brief or supporting docs"}
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>

          {/* Provider + Submit */}
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="text-xs text-[var(--text-secondary)]">Provider</span>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}{p.configured ? "" : " (not configured)"}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Building team..." : "Propose a team →"}
            </button>
          </div>
        </div>

        {/* Demo preset */}
        <button
          type="button"
          onClick={loadDemo}
          className="mt-3 text-xs text-[var(--text-muted)] underline decoration-dotted transition hover:text-[var(--text-secondary)]"
        >
          Try with an example
        </button>

        {error && (
          <p className="mt-3 text-sm text-[var(--attention)]">{error}</p>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Delete old mission-composer.tsx**

```bash
rm src/components/mission-composer.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/composer/ && git add -u && git commit -m "feat: clean mission composer overlay with warm theme"
```

---

## Chunk 3: Sidebar, Output Panel, Integration

### Task 9: Create approval-gate-card.tsx and approval-sidebar.tsx

**Files:**
- Create: `src/components/sidebar/approval-gate-card.tsx`
- Create: `src/components/sidebar/approval-sidebar.tsx`
- Create: `src/components/sidebar/command-input.tsx`

- [ ] **Step 1: Create approval-gate-card.tsx**

```tsx
import type { ApprovalGate, TeamProposal, TaskCard } from "@/lib/types";

interface ApprovalGateCardProps {
  gate: ApprovalGate;
  isBusy: boolean;
  onApprove: () => void;
  // Expandable detail data (passed from parent based on gate type)
  teamProposal?: TeamProposal;
  tasks?: TaskCard[];
}

export function ApprovalGateCard({
  gate,
  isBusy,
  onApprove,
  teamProposal,
  tasks,
}: ApprovalGateCardProps) {
  const isPending = gate.status === "pending";
  const isApproved = gate.status === "approved";

  const bgClass = isPending
    ? "bg-[var(--pending-bg)] border-[var(--pending)]"
    : isApproved
      ? "bg-[var(--success-bg)] border-[var(--success)]/30"
      : "bg-[#f5f5f5] border-[var(--border)]";

  return (
    <div className={`rounded-xl border p-3 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium capitalize text-[var(--foreground)]">
            {gate.gateType.replaceAll("_", " ")}
          </p>
          {isApproved && (
            <span className="text-xs text-[var(--success)]">✓ Validated</span>
          )}
        </div>
        {!isPending && !isApproved && (
          <span className="text-xs text-[var(--text-muted)]">Coming up</span>
        )}
      </div>

      {/* Gate message */}
      {gate.message && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {gate.message}
        </p>
      )}

      {/* Expandable details for team proposal gate */}
      {isPending && gate.gateType === "team_proposal" && teamProposal && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Proposed team: {teamProposal.name}
          </p>
          {teamProposal.roles.map((member) => (
            <div key={member.agentId} className="rounded-lg bg-white/60 p-2">
              <p className="text-xs font-medium">{member.displayName}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {member.title} — {member.rationale}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Expandable details for execution plan gate */}
      {isPending && gate.gateType === "execution_plan" && tasks && tasks.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Task board
          </p>
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg bg-white/60 p-2">
              <p className="text-xs font-medium">{task.title}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {task.workType} — {task.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Approve button */}
      {isPending && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isBusy}
            className="rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isBusy ? "..." : "Validate"}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create command-input.tsx**

```tsx
export function CommandInput() {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
        Orders
      </p>
      <input
        type="text"
        disabled
        placeholder="Give an instruction to the team..."
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-center text-[10px] text-[var(--text-muted)]">
        Available in v2
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create approval-sidebar.tsx**

```tsx
import type { WorkspaceSnapshot } from "@/lib/types";
import { ApprovalGateCard } from "./approval-gate-card";
import { CommandInput } from "./command-input";

interface ApprovalSidebarProps {
  snapshot: WorkspaceSnapshot;
  busyGate: string | null;
  onApprove: (gateType: string) => void;
}

export function ApprovalSidebar({
  snapshot,
  busyGate,
  onApprove,
}: ApprovalSidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex-1 space-y-3">
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
          Validations
        </p>
        {snapshot.approvals.map((gate) => (
          <ApprovalGateCard
            key={gate.gateType}
            gate={gate}
            isBusy={busyGate === gate.gateType}
            onApprove={() => onApprove(gate.gateType)}
            teamProposal={snapshot.teamProposal ?? undefined}
            tasks={snapshot.tasks}
          />
        ))}
        {snapshot.approvals.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            No checkpoints yet.
          </p>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-3">
        <CommandInput />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/ && git commit -m "feat: approval sidebar with gate cards and command input"
```

---

### Task 10: Create artifact-card.tsx and artifact-panel.tsx

**Files:**
- Create: `src/components/outputs/artifact-card.tsx`
- Create: `src/components/outputs/artifact-panel.tsx`

Note: `react-markdown` and `remark-gfm` are already in `package.json` dependencies — no install needed.

- [ ] **Step 1: Create artifact-card.tsx**

```tsx
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ArtifactRecord, ArtifactStatus } from "@/lib/types";

interface ArtifactCardProps {
  artifact: ArtifactRecord;
  isNew?: boolean; // triggers pulse animation
}

const STATUS_STYLES: Record<ArtifactStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-500" },
  needs_review: { bg: "bg-[var(--attention-bg)]", text: "text-[var(--attention)]" },
  approved: { bg: "bg-[var(--success-bg)]", text: "text-[var(--success)]" },
  superseded: { bg: "bg-gray-100 line-through", text: "text-gray-400" },
};

export function ArtifactCard({ artifact, isNew }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[artifact.status];
  const currentContent = artifact.versions.find(
    (v) => v.version === artifact.currentVersion,
  )?.content;

  // Preview: first 3 lines
  const preview = currentContent?.split("\n").slice(0, 3).join("\n") ?? "";

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`min-w-[220px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:shadow-sm ${
          isNew ? "animate-pulse-once" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {artifact.title}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {artifact.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
          v{artifact.currentVersion}
        </p>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
          {preview}
        </p>
      </button>

      {/* Expanded modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {artifact.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  v{artifact.currentVersion} · {artifact.status.replaceAll("_", " ")} · {artifact.schema}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>
            {currentContent && (
              <article className="prose prose-sm mt-4 max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentContent}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Create artifact-panel.tsx**

```tsx
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
```

- [ ] **Step 3: Add pulse-once animation to globals.css**

Append to `src/app/globals.css`:

```css
@keyframes pulse-once {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(196, 154, 60, 0.3); }
  50% { transform: scale(1.02); box-shadow: 0 0 12px 2px rgba(196, 154, 60, 0.15); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(196, 154, 60, 0); }
}

.animate-pulse-once {
  animation: pulse-once 0.6s ease-in-out 1;
}

/* Agent entry animation — agents slide in from left and fade in */
@keyframes agent-enter {
  0% { opacity: 0; transform: translateX(-60px); }
  100% { opacity: 1; transform: translateX(0); }
}

.agent-enter {
  animation: agent-enter 0.6s ease-out both;
}

/* Responsive layout */
@media (max-width: 1024px) {
  .workspace-grid {
    grid-template-columns: 1fr !important;
  }
  .workspace-grid > *:nth-child(2) {
    grid-column: 1 !important;
    grid-row: auto !important;
  }
}

@media (max-width: 768px) {
  .office-container {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 704 / 448;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/outputs/ src/app/globals.css && git commit -m "feat: artifact panel with expandable cards and pulse animation"
```

---

### Task 11: Wire everything into workspace-shell.tsx

**Files:**
- Modify: `src/components/workspace-shell.tsx`

- [ ] **Step 1: Update workspace-shell.tsx to use all new components**

Replace the workspace-shell.tsx content with the final integrated version:

```tsx
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

  // Active workspace: L-shaped layout
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div
        className="workspace-grid mx-auto grid max-w-[1200px] gap-4 px-4 py-8"
        style={{
          gridTemplateColumns: "1fr 250px",
          gridTemplateRows: "auto auto",
        }}
      >
        {/* Top-left: Pixel Office */}
        <section style={{ gridColumn: "1", gridRow: "1" }}>
          <OfficeView snapshot={workspace} />
        </section>

        {/* Right sidebar (spans both rows) */}
        <div style={{ gridColumn: "2", gridRow: "1 / -1" }}>
          <ApprovalSidebar
            snapshot={workspace}
            busyGate={busyGate}
            onApprove={approve}
          />
        </div>

        {/* Bottom-left: Artifacts */}
        <div style={{ gridColumn: "1", gridRow: "2" }}>
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
```

- [ ] **Step 2: Update page.tsx import if needed**

The `page.tsx` already imports from `@/components/workspace-shell`, so no changes needed.

- [ ] **Step 3: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace-shell.tsx && git commit -m "feat: wire all components into L-shaped workspace shell"
```

---

## Chunk 4: Tests and Verification

### Task 12: Write component tests

**Files:**
- Create: `tests/approval-sidebar.test.tsx`
- Create: `tests/artifact-panel.test.tsx`

- [ ] **Step 1: Write approval sidebar test**

Create `tests/approval-sidebar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ApprovalGateCard } from "@/components/sidebar/approval-gate-card";
import type { ApprovalGate } from "@/lib/types";

describe("ApprovalGateCard", () => {
  const pendingGate: ApprovalGate = {
    gateType: "team_proposal",
    status: "pending",
    message: "4 agents proposed",
    requestedAt: Date.now(),
  };

  const approvedGate: ApprovalGate = {
    ...pendingGate,
    status: "approved",
    resolvedAt: Date.now(),
  };

  it("renders pending gate with approve button", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalGateCard gate={pendingGate} isBusy={false} onApprove={onApprove} />,
    );
    expect(screen.getByText("team proposal")).toBeTruthy();
    expect(screen.getByText("Validate")).toBeTruthy();
  });

  it("calls onApprove when button clicked", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalGateCard gate={pendingGate} isBusy={false} onApprove={onApprove} />,
    );
    fireEvent.click(screen.getByText("Validate"));
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it("renders approved gate without button", () => {
    render(
      <ApprovalGateCard gate={approvedGate} isBusy={false} onApprove={() => {}} />,
    );
    expect(screen.getByText("✓ Validated")).toBeTruthy();
    expect(screen.queryByText("Validate")).toBeNull();
  });

  it("disables button when busy", () => {
    render(
      <ApprovalGateCard gate={pendingGate} isBusy={true} onApprove={() => {}} />,
    );
    const btn = screen.getByText("...");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Write artifact panel test**

Create `tests/artifact-panel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ArtifactPanel } from "@/components/outputs/artifact-panel";
import type { ArtifactRecord } from "@/lib/types";

describe("ArtifactPanel", () => {
  const artifact: ArtifactRecord = {
    id: "a1",
    title: "Research Brief",
    type: "document",
    status: "draft",
    schema: "markdown",
    provenance: [],
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: Date.now(),
        content: "# Research\n\nFirst line.\nSecond line.\nThird line.\nFourth line.",
        notes: "",
        sourceTaskIds: [],
        citations: [],
      },
    ],
  };

  it("renders empty state when no artifacts", () => {
    render(<ArtifactPanel artifacts={[]} />);
    expect(screen.getByText(/artifacts will appear/i)).toBeTruthy();
  });

  it("renders artifact cards", () => {
    render(<ArtifactPanel artifacts={[artifact]} />);
    expect(screen.getByText("Research Brief")).toBeTruthy();
    expect(screen.getByText("draft")).toBeTruthy();
    expect(screen.getByText("v1")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass — `office-layout`, `approval-sidebar`, `artifact-panel`, `projector`, `artifact-provenance`, `role-templates`.

- [ ] **Step 4: Write workspace-shell test**

Create `tests/workspace-shell.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WorkspaceShell } from "@/components/workspace-shell";

// Mock child components to isolate shell layout testing
vi.mock("@/components/office/office-view", () => ({
  OfficeView: () => <div data-testid="office-view">Office</div>,
}));
vi.mock("@/components/composer/mission-composer", () => ({
  MissionComposer: () => <div data-testid="mission-composer">Composer</div>,
}));
vi.mock("@/components/sidebar/approval-sidebar", () => ({
  ApprovalSidebar: () => <div data-testid="approval-sidebar">Sidebar</div>,
}));
vi.mock("@/components/outputs/artifact-panel", () => ({
  ArtifactPanel: () => <div data-testid="artifact-panel">Artifacts</div>,
}));

const providers = [{ id: "mock", label: "Mock", configured: true }];

describe("WorkspaceShell", () => {
  it("renders office view and composer when no workspace", () => {
    render(<WorkspaceShell providers={providers} />);
    expect(screen.getByTestId("office-view")).toBeTruthy();
    expect(screen.getByTestId("mission-composer")).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass including workspace-shell.

- [ ] **Step 6: Commit**

```bash
git add tests/ && git commit -m "test: add approval sidebar, artifact panel, and workspace shell tests"
```

---

### Task 13: Full end-to-end verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on localhost:3000.

- [ ] **Step 2: Verify empty office + composer**

Open `http://localhost:3000` in browser.
Expected:
- Warm cream background
- Pixel office grid visible (warm parquet, wall, furniture)
- Composer overlay centered with 3 fields
- "Try with an example" link visible

- [ ] **Step 3: Submit demo mission**

Click "Try with an example", then "Propose a team →".
Expected:
- Overlay disappears
- Agents appear in the office at their desks
- Sidebar shows "team_proposal" gate as pending with team details

- [ ] **Step 4: Approve through all gates**

Click "Validate" for each gate.
Expected:
- Agents change states (some move to meeting room, back to desks)
- State bubbles appear/change (search, pencil, clock, checkmark)
- Artifact cards appear in bottom panel with updating statuses
- Final gate resolves, workspace reaches "complete" status

- [ ] **Step 5: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Run all tests one final time**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 7: Final commit**

```bash
git add -A && git commit -m "chore: pixel office UI redesign complete — warm theme, HTML/CSS renderer, L-shaped layout"
```
