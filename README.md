# Team Foundry

> Create AI teams and watch them work in a pixel office.

Team Foundry is a local-first web app where you describe a mission in plain language, an AI orchestrator **designs a custom team from scratch**, and you watch your agents work in real-time in a pixel-art office — idle-game style, warm and cozy.

Drop a brief, approve the squad, and watch structured deliverables come together while your pixel employees move between their desks, hold meetings, research, and write.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D20-blue)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![Status](https://img.shields.io/badge/status-experimental-orange)

---

## 100% Vibecoded

This entire project was vibecoded — designed, planned, and implemented through natural language conversations with AI. Every line of code, every pixel-art sprite, every SVG furniture piece was generated through collaborative prompting. No manual coding involved.

**The vibe stack:**
- Brainstormed the concept and UI direction conversationally
- Designed the architecture through Q&A and iterative refinement
- Generated a formal spec, had it reviewed by AI, fixed issues
- Wrote a detailed implementation plan with 13 tasks
- Dispatched parallel AI agents to implement each task independently
- Two-stage AI code review (spec compliance + quality) after each task
- Visually verified the result through automated browser screenshots

**Why this matters:** This is what building software looks like when you describe what you want and AI builds it. The entire project — pixel-art office, warm theme, generative team composition, 30+ role types, idle-game visuals, 10 business presets, 20 tests — was built in a single conversation.

---

## What it does

1. **You describe a mission** — "I need a sales team to build an outbound playbook for construction companies"
2. **AI designs a custom team** — not from a catalog, but generated from your brief. Each role has a title, purpose, and skills tailored to YOUR mission
3. **You approve** — review the team composition, the task board, and the expected deliverables
4. **Watch them work** — agents sit at their desks, hold meetings, research, write. State bubbles show what each agent is doing in real-time
5. **Collect deliverables** — structured documents appear in the output panel as the team produces them

### Generative team composition

The orchestrator **reads your brief and creates the exact team you need**. It doesn't pick from a fixed menu — it analyzes what your mission requires and generates custom roles:

- A marketing brief might create: Mission Lead, Research Analyst, Marketing Strategist, Content Strategist, SEO Specialist, Quality Reviewer
- A sales brief might create: Mission Lead, Sales Strategist, Outbound Specialist, Financial Analyst, Communications Specialist, Quality Reviewer
- An advisory board brief might create: Mission Lead, Strategic Advisor, Financial Analyst, Legal Advisor, Growth Advisor, Industry Expert, Quality Reviewer

Team size adapts automatically: 4 agents for focused missions, 12+ for complex cross-functional work.

---

## The pixel office

The office is rendered in **GBA / RPG Maker 3/4 view** using pure HTML/CSS — no game engine, no WebGL. Style inspired by idle games on Android.

**Agents** are pixel-art characters with:
- Distinct appearances: hair styles (short, long, bald, ponytail), skin tones, clothing colors
- Accessories: glasses, ties, hats
- Idle animations: subtle bob when sitting, floating state bubbles
- State bubbles: magnifying glass (research), pencil (writing), notepad (planning), clock (waiting), checkmark (done)

**The office** scales with team size and includes:
- Desks with monitors (showing code), keyboards, coffee mugs, sticky notes, small plants
- Windows with warm orange curtains and sunlight glow
- Wall clock with second hand, motivational poster with landscape
- Task board with colorful post-its (kanban style)
- Bookshelf with colorful books and a small trophy
- Large dashboard TV showing charts and graphs
- Coffee machine with colored buttons and steam
- Printer with paper output
- Water cooler
- Filing cabinets with colored tabs
- Floor lamp with warm glow
- Meeting rooms with oval table, rug, papers, laptop, coffee cups
- Break room with blue couch, orange pillow, plants
- Plants in 3 varieties: cactus with flower, tall leafy, bushy with flowers

**Scaling:** 2-5 agents = compact office. 6-8 = standard + break room. 9+ = big open space with 2 meeting rooms.

---

## 10 ready-to-use presets

Click a button, and the brief is pre-filled for you:

| Preset | What it creates | Typical team size |
|--------|----------------|-------------------|
| **Marketing Intelligence** | Market snapshot, action plan, final packet | 5-6 agents |
| **Content Strategy** | Personas, editorial calendar, style guide | 5-7 agents |
| **Competitive Analysis** | Competitor matrix, positioning map, gap analysis | 6-8 agents |
| **Employee Onboarding Pack** | Welcome guide, 30/60/90 plan, culture handbook | 5-6 agents |
| **Event Planning Brief** | Run-of-show, promotion plan, logistics checklist | 8-10 agents |
| **Investor Update Report** | Investor memo, KPI summary, next quarter priorities | 6-8 agents |
| **Advisory Board** | Strategic memo, risk assessment, growth reco | 10-12 agents |
| **Sales & Prospection** | ICP, outbound sequences, objection handling | 8-12 agents |
| **Tech Strategy** | Stack assessment, architecture reco, security audit | 7-9 agents |
| **Business Analysis** | Market sizing, competitor deep-dive, go/no-go reco | 7-9 agents |

Or write your own brief from scratch — the orchestrator will design the right team.

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
| Rendering | Pure HTML/CSS + inline SVG pixel-art (no game engine) |
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
    office/               # Pixel office: agents, furniture, meeting bubbles
    composer/             # Mission brief form (overlay with presets)
    sidebar/              # Approval gates + command input (v2)
    outputs/              # Artifact cards panel with markdown expand
  lib/
    runtime/
      engine.ts           # Generative team designer + workspace lifecycle
      projector.ts        # Event → state reconstruction
      scheduler.ts        # Execution timeline + event emission
      adapters/           # Provider (LLM) + tool adapters
    db/                   # SQLite schema + client
    state/
      office-layout.ts    # Dynamic office grid that scales with team size
    role-templates.ts     # 30+ role reference library for prompt enrichment
    types.ts              # All domain types (normalized, public)
tests/                    # 20 unit + component tests
public/sprites/           # SVG bubble icons for agent states
```

## How it works

### Generative team design

When you submit a brief, the engine:
1. **Analyzes** the text to identify what needs to be done (research, strategy, content, sales, legal, etc.)
2. **Creates custom roles** — each with a title, purpose, skills, and deliverable, tailored to YOUR specific mission
3. **Assigns phases** — mission framing first, then research, then synthesis/writing, then review
4. **Builds a task board** with dependencies between phases

The 30+ role templates serve as a **reference library** for enriching agent prompts, not as the source of truth for team composition.

### Event-sourced runtime

Every state change is an append-only event. The UI reconstructs state by replaying events, enabling deterministic behavior and future replay support.

### Approval gates

Three mandatory human checkpoints:
1. **Team proposal** — review agents, roles, and rationale before anything starts
2. **Execution plan** — review the task board before agents begin work
3. **Final deliverables** — review outputs before marking the run complete

### Provider abstraction

Swap between OpenAI, Anthropic, Gemini, Ollama, or mock with a single config change. The runtime doesn't care which model powers the agents.

### Truthful visualization

Agents only move when their actual task state changes. No fake ambient animation (except idle bob). What you see is what's happening.

---

## Testing

```bash
npm test          # 20 unit + component tests
npm run lint      # ESLint
npm run build     # Production build
```

### Manual E2E test

1. `npm run dev` → open localhost:3000
2. Pick any preset (e.g., "Sales & Prospection") → "Propose a team"
3. Review the custom team in the sidebar → "Validate"
4. Review the task board → "Validate"
5. Watch agents work (~10 seconds) — bubbles change, artifacts appear
6. "Validate" final deliverables → mission complete
7. Click an artifact card to expand and read the full content

---

## Roadmap

### v2.1 — Current

- [x] Generative team composition — roles created from brief, not from catalog
- [x] 10 business presets (marketing, sales, tech, advisory, etc.)
- [x] Idle-game visual style with detailed SVG furniture and pixel-art agents
- [x] Agent accessories (glasses, ties, hats) and hair style variants
- [x] Idle animations (sitting bob, bubble float)
- [x] Scalable office (2-20+ agents, break room, multiple meeting rooms)
- [x] Dashboard TV, bookshelves, printer, water cooler, filing cabinets, rugs
- [x] GBA 3/4 pixel-art office with HTML/CSS rendering
- [x] Warm cream theme, L-shaped layout
- [x] Event-sourced runtime with approval gates

### v3 — Web research & real agent tools

- [ ] **Web research tool** — agents can search the web (Playwright, MCP, or API-based)
- [ ] **Document analysis** — agents can read and summarize uploaded PDFs/docs in depth
- [ ] **Citation system** — every claim in deliverables links back to its source
- [ ] **Tool use visualization** — see in the office when an agent is browsing the web vs writing
- [ ] **Real LLM execution** — connect to OpenAI/Claude/Gemini for actual AI-generated content

### v4 — Live interaction & collaboration

- [ ] **Real-time chat** — give instructions to the team during execution
- [ ] **Agent micro-management** — click an agent, see their task, redirect them
- [ ] **Task reassignment** — drag tasks between agents on the task board
- [ ] **Notification system** — agents flag when they need human input
- [ ] **Meeting transcripts** — see what agents discussed in their meetings

### v5 — Multi-team & persistence

- [ ] **Multiple workspaces** — run several teams in parallel
- [ ] **Run history** — browse past missions and replay them
- [ ] **Template library** — save and share team compositions
- [ ] **Export** — download deliverables as PDF, DOCX, or markdown
- [ ] **Replay mode** — scrub through a completed run like a timeline

### Future vision

- [ ] **LPC sprite packs** — swap in real RPG Maker-style character sprites
- [ ] **Custom office layouts** — design your own office floorplan
- [ ] **Agent personalities** — each agent has quirks and working styles visible in behavior
- [ ] **Multi-user** — invite teammates to watch and interact with the same office
- [ ] **Plugin system** — add custom tools (Slack, Jira, GitHub, etc.)
- [ ] **MCP integration** — connect to any MCP-compatible tool server
- [ ] **Voice briefs** — describe your mission by speaking instead of typing

---

## Contributing

Contributions are welcome! This project is vibecoded and we'd love to keep that energy going.

**Good first issues:**
- Add more furniture types to the office (water fountain, vending machine, etc.)
- Improve character sprites (LPC spritesheet integration for real walk animations)
- Add more preset briefs for specific industries
- Improve artifact rendering (better markdown styles, syntax highlighting)
- Add dark mode support

**Medium contributions:**
- Add agent personality traits that affect behavior and deliverable style
- Implement meeting visualization (agents gather, speech bubbles with discussion topics)
- Build the run history / replay feature
- Add export to PDF/DOCX

**Major contributions:**
- Implement the web research tool adapter (Playwright or API-based)
- Build the real-time chat system (v4)
- Add MCP tool server integration
- Implement real LLM execution with streaming

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
| Agents not appearing after submit | Clear `.data/` and reload |

## Credits

- Pixel-art bubble icons: custom SVGs
- Office furniture: custom inline SVGs inspired by idle game aesthetics
- Agent characters: procedural pixel-art with CSS
- Sprite reference: [Liberated Pixel Cup](https://lpc.opengameart.org/) (CC-BY-SA 3.0) for future sprite upgrades

## License

MIT — see [LICENSE](LICENSE).

---

**Built with vibes, not keystrokes.**
