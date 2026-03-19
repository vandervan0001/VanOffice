# Team Foundry

> Describe a mission, get an AI-generated team, watch them work in a pixel office.

Team Foundry is a local-first web app where you describe a mission in plain language, an AI orchestrator designs a custom team, and agents execute tasks sequentially to produce real LLM-generated deliverables. A pixel-art office visualizes the execution state.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20-blue)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![Status](https://img.shields.io/badge/status-MVP%20experimental-orange)

---

## Current state (MVP)

This is an early MVP. Here is what actually works and what does not:

**Working:**
- Generative team composition: the LLM reads your brief and creates custom roles (not from a fixed catalog)
- Sequential agent execution: agents execute one at a time, each producing real LLM-generated deliverables
- Functional chat coordinator: give orders like "Draft a SWOT", "Hire a SEO specialist", "Revise the marketing plan" — the coordinator picks the right agent and executes
- Dynamic agent hiring: the coordinator can create new agents on-the-fly based on your needs
- Real LLM providers: Gemini and Anthropic (Claude) tested and functional; OpenAI and Ollama adapters exist
- Event-sourced runtime with three approval gates (team, execution plan, final deliverables)
- Deliverable status filters: hide approved items, focus on drafts and items needing review
- Markdown-formatted chat responses with proper bold, lists, and structure
- Deliverable revision with specific feedback injection
- Export all deliverables as markdown
- Workspace auto-save and resume
- 10 mission presets (marketing, sales, tech, advisory, etc.)
- Pixel office with agents at desks, state bubbles, and A* pathfinding

**Limitations:**
- Agents execute sequentially (no parallel execution yet)
- Walk animations are implemented but may not always be visible in real-time
- No web research, MCP tools, or document analysis yet
- No standalone installer yet (requires Node.js to run)

---

## What it does

1. **You describe a mission** — e.g., "Build an outbound sales playbook for construction companies"
2. **AI designs a custom team** — generated from your brief, not from a fixed menu
3. **You approve** — review the team, task board, and expected deliverables at each gate
4. **Agents execute** — one at a time, each calling the configured LLM to produce content
5. **Collect deliverables** — structured documents appear in the output panel

---

## Quick start

```bash
git clone https://github.com/vandervan0001/VanOffice.git
cd VanOffice
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a preset or write your own brief.

### Requirements

- **Node.js** >= 20
- **npm** >= 10
- Native build tools for `better-sqlite3`:
  - macOS: `xcode-select --install`
  - Linux: `sudo apt install build-essential python3 make g++`
  - Windows: Visual Studio Build Tools

### Provider setup

The app works out of the box with a **mock provider** (no API key needed) for testing the UI and flow.

To use real AI providers, create `.env.local`:

```bash
# Primary tested providers:
GEMINI_API_KEY=...              # Google Gemini (default model: gemini-2.5-flash)
ANTHROPIC_API_KEY=sk-ant-...    # Anthropic Claude (default model: claude-sonnet-4-6)

# Additional providers:
OPENAI_API_KEY=sk-...

# Or use a local model:
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

See `.env.example` for all options.

### Optional: Paperclip orchestration

[Paperclip AI](https://paperclipai.com) is an optional orchestration sidecar. When running on `localhost:3100`, Team Foundry routes agent execution through Paperclip. This integration is wired but not yet fully tested end-to-end.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Rendering | Phaser.js 3 + LPC spritesheets |
| LLM Providers | Gemini, Anthropic (Claude), OpenAI, Ollama |
| Orchestration | Paperclip AI (optional, experimental) |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Styling | Tailwind CSS 4 |
| Testing | Vitest + Testing Library |
| Architecture | Event-sourced runtime, SSE live updates |

## Project structure

```
src/
  app/                    # Next.js routes + API endpoints
    api/workspaces/       # REST + SSE endpoints
  components/
    office/
      phaser-office.tsx   # Phaser game scene (renders the pixel office)
    composer/             # Mission brief form (overlay with presets)
    sidebar/              # Approval gates + command input
    outputs/              # Artifact cards panel with markdown expand
  lib/
    runtime/
      engine.ts           # Generative team designer + workspace lifecycle
      projector.ts        # Event -> state reconstruction
      scheduler.ts        # Sequential execution + event emission
      adapters/
        paperclip.ts      # Paperclip REST client
        providers.ts      # LLM provider adapters
    db/                   # SQLite schema + client
    state/
      office-layout.ts    # Dynamic office grid
      pathfinding.ts      # A* pathfinding for agent movement
    types.ts              # All domain types
tests/                    # Unit + component tests
public/sprites/
  chars/                  # LPC character spritesheets
  bubbles/                # SVG bubble icons for agent states
```

---

## Testing

```bash
npx vitest run        # Unit + component tests
npm run lint          # ESLint
npm run build         # Production build
```

---

## Roadmap

### Done

- [x] Generative team composition from natural language briefs
- [x] 10 business presets (marketing, sales, tech, advisory, etc.)
- [x] Real LLM execution with Gemini and Anthropic (Claude)
- [x] Functional chat coordinator — sends real orders to agents (run, revise, hire)
- [x] Deliverable status filters (Draft, Needs review, Approved — hide/show)
- [x] Markdown-formatted chat responses
- [x] Deliverable revision with feedback injection
- [x] Dynamic agent hiring via chat ("I need a SEO specialist")
- [x] New artifacts created per command (not overwriting existing ones)
- [x] Canvas pixel office with LPC spritesheets and A* pathfinding
- [x] Scalable office (desks, meeting rooms, boss office, server room, archives, lounge, WC)
- [x] Event-sourced runtime with three approval gates
- [x] Export all deliverables as markdown
- [x] Workspace save/resume (auto-persist to SQLite)
- [x] Paperclip AI orchestration (optional sidecar)
- [x] Mock provider for UI testing without API keys

### Next up

- [ ] **One-click installer** — standalone `.exe` / `.app` / `.AppImage` (Electron or Tauri) so non-developers can launch without Node.js, npm, or terminal
- [ ] Parallel agent execution (multiple agents working simultaneously)
- [ ] Web research tool (Playwright browser automation or API-based search)
- [ ] MCP tool server integration
- [ ] Export deliverables as PDF/DOCX
- [ ] Tile-by-tile walk animations visible in real-time

### Future

- [ ] Real-time agent micro-management (click agent, see task, redirect)
- [ ] Question cascade — agents ask the user questions via popup when stuck
- [ ] Multi-workspace support (run several teams in parallel)
- [ ] Run history and replay mode
- [ ] Plugin system for external tools (Slack, Jira, GitHub)
- [ ] Custom office layouts (tilemap editor)
- [ ] Voice briefs — describe your mission by speaking

---

## Local data

Runtime data is stored in `.data/` (gitignored):
- SQLite DB: `.data/team-foundry.db`

Paperclip runtime data is stored in `.paperclip-data/` (gitignored).

To reset: `rm -rf .data .paperclip-data`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `database is locked` | Ensure no parallel process writes the same DB |
| `Failed to open database` (Turbopack) | Run `npm run clean:next` then `npm run dev` |
| Agents not appearing after submit | Clear `.data/` and reload |
| Paperclip not detected | Ensure `paperclipai run` is active on `localhost:3100` |
| LLM API key errors | Check `.env.local` has valid keys |
| Empty deliverables | Verify provider API key is set and model name is correct |

## Credits

- Pixel-art characters: [Liberated Pixel Cup (LPC)](https://lpc.opengameart.org/) spritesheets (CC-BY-SA 3.0)
- Game engine: [Phaser.js 3](https://phaser.io/)

## License

MIT — see [LICENSE](LICENSE).
