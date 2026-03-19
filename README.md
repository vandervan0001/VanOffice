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
- Sequential agent execution: agents execute one at a time, each producing a real LLM-generated deliverable
- Real LLM providers: Gemini and Anthropic (Claude) are tested and functional; OpenAI and Ollama adapters exist
- Event-sourced runtime: every state change is an append-only event stored in SQLite
- Three approval gates: team proposal, execution plan, final deliverables
- 10 mission presets (marketing, sales, tech, advisory, etc.)
- Chat input sends instructions to a coordinator LLM and displays responses
- Deliverable revision with feedback injection
- Pixel office renders agents at desks with state bubbles and A* pathfinding walk animations

**Limitations:**
- Agents execute sequentially (no parallel execution yet)
- Phaser office has spacing/scaling issues at larger team sizes
- Paperclip AI integration is wired but not fully tested end-to-end
- No web research, MCP tools, or document analysis yet
- No real-time agent micro-management or task reassignment

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
- [x] Real LLM execution with Gemini and Anthropic
- [x] Phaser.js 3 pixel office with LPC spritesheets
- [x] A* pathfinding and walk animations for agents
- [x] Agent state bubbles (research, writing, planning, waiting, done)
- [x] Event-sourced runtime with three approval gates
- [x] Chat input with LLM coordinator responses
- [x] Deliverable revision with feedback injection
- [x] Scalable office layout (desks, meeting rooms, break room, boss office, server room, etc.)
- [x] Mock provider for UI testing without API keys

### Next up

- [ ] Fix Phaser office spacing/scaling at larger team sizes
- [ ] Parallel agent execution
- [ ] Verify Paperclip end-to-end execution
- [ ] Web research tool (Playwright browser automation)
- [ ] MCP tool server integration
- [ ] Export deliverables as PDF/DOCX

### Future

- [ ] Real-time agent micro-management (click agent, redirect tasks)
- [ ] Multi-workspace support
- [ ] Run history and replay mode
- [ ] Plugin system for external tools (Slack, Jira, GitHub)
- [ ] Custom office layouts

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
