# Team Foundry

> Create AI teams and watch them work in a pixel office.

Team Foundry is a local-first web app where you describe a mission in plain language, an AI proposes the right team, and you watch your agents work in real-time in a pixel-art office — GBA-style, warm and cozy.

Drop a brief, approve the squad, and watch structured deliverables come together while your pixel employees move between their desks, hold meetings, research, and write.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20-blue)
![Status](https://img.shields.io/badge/status-experimental-orange)

---

## 100% Vibecoded

This entire project was vibecoded — designed, planned, and implemented through natural language conversations with AI. Every line of code, every pixel-art sprite, every component was generated through collaborative prompting. No manual coding involved.

**The vibe stack:**
- Brainstormed the concept and UI direction conversationally
- Designed the architecture through Q&A and iterative refinement
- Generated a formal spec, had it reviewed by AI, fixed issues
- Wrote a detailed implementation plan with 13 tasks
- Dispatched parallel AI agents to implement each task independently
- Two-stage AI code review (spec compliance + quality) after each task
- Visually verified the result through automated browser screenshots

**Why this matters:** This is what building software looks like when you describe what you want and AI builds it. The entire v2 redesign (pixel-art office, warm theme, new layout, 13 new files, 20 tests) was completed in a single conversation.

---

## What it does

1. **You describe a mission** — "I need a marketing team to analyze our competition and build an action plan"
2. **AI proposes a team** — Mission Planner, Research Lead, Strategy Lead, Editor Reviewer — with roles, skills, and rationale
3. **You approve** — review the team, the task board, and the expected deliverables
4. **Watch them work** — agents sit at their desks, hold meetings, research, write. State bubbles show what each agent is doing
5. **Collect deliverables** — structured documents appear in the output panel as the team produces them

## The pixel office

The office is rendered in **GBA / RPG Maker 3/4 view** using pure HTML/CSS — no game engine, no WebGL. Agents are pixel-art characters with distinct appearances (hair, clothes, skin), and they move between zones based on real task states:

- **At their desk** — idle, planning, writing, researching
- **In the meeting room** — when 2+ agents need to collaborate
- **State bubbles** — magnifying glass (research), pencil (writing), notepad (planning), clock (waiting), checkmark (done)

The furniture is detailed: desks with monitors and coffee mugs, windows with curtains, a clock on the wall, a task board with colorful post-its, potted plants, and a coffee machine.

---

## Quick start

```bash
git clone https://github.com/vandervan0001/VanOffice.git
cd VanOffice
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click "Try with an example" to see the demo flow.

### Requirements

- **Node.js** >= 20
- **npm** >= 10
- Native build tools for `better-sqlite3`:
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential python3 make g++`
  - Windows: Visual Studio Build Tools

### Provider setup

The app works out of the box with a **mock provider** (no API key needed) — perfect for testing the UI and flow.

To use real AI providers, create `.env.local`:

```bash
# Pick one or more:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Or use a local model:
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

See `.env.example` for all options.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Rendering | Pure HTML/CSS pixel-art (no game engine) |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Styling | Tailwind CSS 4 |
| Testing | Vitest + Testing Library |
| Architecture | Event-sourced runtime, SSE live updates |

## Project structure

```
src/
  app/              # Next.js routes + API endpoints
  components/
    office/         # Pixel office: agents, furniture, meeting bubbles
    composer/       # Mission brief form (overlay)
    sidebar/        # Approval gates + command input
    outputs/        # Artifact cards panel
  lib/
    runtime/        # Engine, projector, scheduler, adapters
    db/             # SQLite schema + client
    state/          # Office layout logic
    types.ts        # All domain types
tests/              # Unit + component tests
public/sprites/     # SVG bubble icons
```

## How it works (architecture)

**Event-sourced runtime** — every state change is an append-only event. The UI reconstructs state by replaying events, enabling deterministic behavior and future replay support.

**Approval gates** — three mandatory human checkpoints:
1. **Team proposal** — review agents, roles, and rationale before anything starts
2. **Execution plan** — review the task board before agents begin work
3. **Final deliverables** — review outputs before marking the run complete

**Provider abstraction** — swap between OpenAI, Anthropic, Gemini, Ollama, or mock with a single config change. The runtime doesn't care which model powers the agents.

**Truthful visualization** — agents only move when their actual task state changes. No fake ambient animation. What you see is what's happening.

---

## Testing

```bash
npm test          # Run all unit + component tests
npm run lint      # ESLint
npm run build     # Production build
```

### Manual E2E test

1. `npm run dev` → open localhost:3000
2. Click "Try with an example" → "Propose a team"
3. Approve team → approve execution plan → watch agents work
4. Approve final deliverables → run completes
5. Check artifacts in the bottom panel

---

## Roadmap

### v2 — Current (pixel office redesign)

- [x] GBA 3/4 pixel-art office with HTML/CSS rendering
- [x] Warm cream theme, clean UI
- [x] L-shaped layout: office top, outputs bottom, sidebar right
- [x] Pixel-art character sprites with unique appearances
- [x] Detailed furniture SVGs (desks, monitors, plants, coffee machine, task board)
- [x] State bubbles for agent activity
- [x] Staggered agent entry animation
- [x] Expandable approval gates with team/task details
- [x] Artifact cards with status badges and markdown preview
- [x] Responsive layout breakpoints

### v3 — Web research & real agent tools

- [ ] **Web research tool** — agents can search the web (Playwright, MCP, or API-based)
- [ ] **Document analysis** — agents can read and summarize uploaded PDFs/docs in depth
- [ ] **Citation system** — every claim in deliverables links back to its source
- [ ] **Tool use visualization** — see in the office when an agent is browsing the web vs writing
- [ ] **Real LLM execution** — connect to OpenAI/Claude/Gemini for actual AI-generated content (not mock)

### v4 — Live interaction & collaboration

- [ ] **Real-time chat** — give instructions to the team during execution
- [ ] **Agent micro-management** — click an agent, see their task, redirect them
- [ ] **Task reassignment** — drag tasks between agents on the task board
- [ ] **Notification system** — agents flag when they need human input
- [ ] **Meeting transcripts** — see what agents discussed in their meetings

### v5 — Multi-team & persistence

- [ ] **Multiple workspaces** — run several teams in parallel
- [ ] **Run history** — browse past missions and replay them
- [ ] **Template library** — pre-built team templates (marketing, research, strategy, content)
- [ ] **Export** — download deliverables as PDF, DOCX, or markdown
- [ ] **Replay mode** — scrub through a completed run like a timeline

### Future vision

- [ ] **LPC sprite packs** — swap in real RPG Maker-style character sprites
- [ ] **Custom office layouts** — design your own office floorplan
- [ ] **Agent personalities** — each agent has quirks and working styles
- [ ] **Multi-user** — invite teammates to watch and interact with the same office
- [ ] **Plugin system** — add custom tools (Slack, Jira, GitHub, etc.)
- [ ] **MCP integration** — connect to any MCP-compatible tool server

---

## Contributing

Contributions are welcome! This project is vibecoded and we'd love to keep that energy going.

**Good first issues:**
- Add more furniture types to the office
- Improve character sprites (LPC spritesheet integration)
- Add more role templates (designer, developer, analyst...)
- Improve artifact rendering (better markdown styles)

**Bigger contributions:**
- Implement the web research tool adapter
- Add Playwright-based browsing capability for agents
- Build the real-time chat system (v4)
- Add MCP tool server integration

See the roadmap above for direction. Open an issue to discuss before starting major work.

---

## Local data

Runtime data is stored in `.data/` (gitignored):
- SQLite DB: `.data/team-foundry.db`
- Uploaded files: `.data/uploads/<workspace-id>/`

To reset: `rm -rf .data`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `database is locked` | Ensure no parallel process writes the same DB |
| `Failed to open database` (Turbopack) | Run `npm run clean:next` then use `npm run dev` |
| macOS `._*` metadata files | Run `npm run clean:metadata` |

## License

MIT — see [LICENSE](LICENSE).

---

**Built with vibes, not keystrokes.**
