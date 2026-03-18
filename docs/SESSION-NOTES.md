# Session Notes — 2026-03-18

## What was built

### Architecture (solid, keep as-is)
- Event-sourced runtime: engine.ts, projector.ts, scheduler.ts
- Generative team composition from brief analysis (30+ role types)
- 10 business presets (marketing, sales, advisory, tech, etc.)
- SQLite + Drizzle persistence
- SSE live updates
- 26 tests passing, clean build

### Paperclip Integration (wired, needs finishing)
- REST client: `src/lib/runtime/adapters/paperclip.ts`
- Executor: `src/lib/runtime/paperclip-executor.ts`
- Health check + status badge in UI
- Auto-fallback to mock when Paperclip not running
- Provider-to-adapter mapping (Gemini→process, Claude→claude_local, etc.)
- **NOT WORKING YET:** Paperclip onboarding creates a fresh instance but our app doesn't auto-create the first company. The dashboard at localhost:3100 shows onboarding wizard instead of the company we created via API. Need to investigate if `local_trusted` mode requires bootstrap first.

### Phaser Office (basic, needs rewrite)
- `src/components/office/phaser-office.tsx` — 694 lines
- Loads character spritesheets (16x32, 6 characters from agent-office MIT)
- Loads LPC office tiles (desks, laptops, coffee, TV, etc.)
- Walk animations, speech bubbles, sound effects
- **PROBLEMS:**
  - Grid spacing is off — desks overlap or have too much space depending on team size
  - Office doesn't fill the viewport properly (big empty area on left side)
  - LPC tiles need individual scale tuning (each has different native dimensions)
  - Need a proper tilemap approach instead of manual Graphics + Image positioning

### UI Components (functional)
- Workspace shell: 50/50 layout, validations + orders as separate cards
- Mission composer: 10 presets, clean form, scrollable
- Approval gates: team editing (add/remove roles), feedback textarea, reject button (v3)
- Artifact panel: structured markdown content, expandable modal
- Command input: contextual suggestion pills
- New team button

## Known Issues

### Critical
1. **Phaser rendering quality** — Office layout needs a proper tilemap editor approach, not manual coordinate placement. The current approach of placing Graphics + Images at computed positions breaks at different team sizes and screen resolutions.
2. **Paperclip not executing** — Agents are created via API but the LLM execution doesn't actually run. Need to verify: (a) does `local_trusted` mode auto-bootstrap? (b) are agent adapters configured correctly? (c) does the heartbeat trigger agent execution?
3. **Paperclip dashboard onboarding** — localhost:3100 shows setup wizard even after API-created companies. May need to complete onboarding once manually before API works.

### Medium
4. **Office viewport** — Camera fit works but office is offset (big margin on left). The Phaser world size doesn't match the container aspect ratio.
5. **LPC tile scaling** — Each tile image has different native dimensions (desk=160x128, laptop=128x128, TV=288x128). Need per-tile scale factors, not a global scale.
6. **Mock vs real execution** — When Paperclip is running, the mock scheduler should NOT run. Currently both may fire.

### Low
7. Command pills are visual only (no backend action)
8. Team editing is visual only (doesn't affect actual team)
9. Reject button is disabled (v3)
10. No sound plays in some browsers (autoplay policy)

## Recommended Next Steps

### Step 1: Fix Phaser Office (Priority: HIGH)
**Option A — Tilemap approach:**
- Use Tiled editor to create a proper office tilemap (.json)
- Load it in Phaser with `this.make.tilemap()`
- Place agents on the tilemap grid
- This is how serious pixel games do it

**Option B — Simpler fix:**
- Keep Graphics-based rendering but fix the math
- Calculate world size to match container aspect ratio
- Use consistent spacing based on actual tile dimensions
- Center the office properly

### Step 2: Fix Paperclip Execution (Priority: HIGH)
- Complete Paperclip onboarding once manually at localhost:3100
- Then verify API company creation works
- Test: create company → create agent with claude_local adapter → create issue → trigger heartbeat → check if agent runs
- May need to configure LLM in Paperclip's config (not just env vars)

### Step 3: End-to-end Real Execution (Priority: MEDIUM)
- User selects Gemini → submits brief → Team Foundry creates Paperclip company
- Validates team → validates plan → Paperclip agents execute tasks with Gemini
- Activity feed → RunEvents → Phaser animations
- Real deliverable content appears in artifact panel

## File Reference

### Core (don't touch)
- `src/lib/types.ts` — All domain types
- `src/lib/runtime/projector.ts` — Event replay
- `src/lib/db/` — SQLite persistence
- `src/app/api/` — REST + SSE endpoints

### Rendering (needs work)
- `src/components/office/phaser-office.tsx` — Phaser scene (needs rewrite)
- `src/components/office/office-view.tsx` — Old HTML/CSS office (fallback)
- `src/lib/state/office-layout.ts` — Grid position calculator

### Paperclip (needs testing)
- `src/lib/runtime/adapters/paperclip.ts` — REST client
- `src/lib/runtime/paperclip-executor.ts` — Orchestration bridge
- `src/lib/runtime/engine.ts` — Wiring (lines 652-658)

### UI (functional)
- `src/components/workspace-shell.tsx` — Main layout
- `src/components/composer/mission-composer.tsx` — Brief form
- `src/components/sidebar/` — Validations + commands
- `src/components/outputs/` — Artifacts

### Assets
- `public/assets/characters/char_0-5.png` — Agent sprites (from agent-office, MIT)
- `public/assets/tiles/*.png` — LPC office tiles (CC-BY-SA 3.0)
- `public/assets/sounds/task-complete.wav` — Notification beep

## Research Done
- Analyzed 5 open-source pixel office projects (pixel-agents, agent-office, claw-empire, Star-Office-UI, agents-in-the-office)
- Identified best asset packs: LPC Revised The Office (free), MetroCity characters (free), LimeZu Modern Office ($2.50)
- Documented rendering approaches: Canvas 2D, Phaser 3, PixiJS 8
- Paperclip API documented: companies, agents, issues, secrets, activity, approvals
