# Team Foundry

Team Foundry is a local-first web app to create an AI team from a mission brief, approve the plan, then watch real execution states in a pixel-office scene while structured artifacts are produced in parallel.

This repository is intentionally public-ready: reproducible setup, clear requirements, explicit runtime behavior, and a clean git hygiene baseline.

## Core capabilities (v1)

- Mission flow: `brief -> parsed understanding -> team proposal -> approval -> execution -> final approval`
- Truthful pixel-office UI backed by real task and agent states
- Event-sourced runtime with replayable event timeline
- Approval gates:
  - `team_proposal`
  - `execution_plan`
  - `final_deliverables`
- Structured artifact lifecycle:
  - `draft`
  - `needs_review`
  - `approved`
  - `superseded`
- Provider adapters:
  - `mock` (default, no API key needed)
  - `openai`
  - `anthropic`
  - `gemini`
  - `ollama`

## Tech stack

- `Next.js 16` + `React 19` + `TypeScript`
- `PixiJS` for office rendering
- `SQLite` (`better-sqlite3`) + `drizzle-orm` for persistence
- `Vitest` for unit tests

## Requirements

- `Node.js` >= 20 (tested with 25.x)
- `npm` >= 10
- Build toolchain for native modules (`better-sqlite3`):
  - macOS: Xcode Command Line Tools
  - Linux: `build-essential`, `python3`, `make`, `g++`
  - Windows: Visual Studio Build Tools

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment setup

The app runs without external providers using `mock` mode.

To enable cloud/local providers, create `.env.local` and set one or more values:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

Optional local storage override:

```bash
TEAM_FOUNDRY_DATA_DIR=/absolute/path/to/data
```

## How to test

### Automated checks

```bash
npm run lint
npm run test
npm run build
```

### Manual product test (end-to-end)

1. Start dev server:

```bash
npm run dev
```

2. Open `http://localhost:3000`.
3. Fill mission goal + brief text, optionally upload files, choose provider.
4. Click `Propose the team`.
5. In `Approvals`, click `Approve` for `team_proposal`.
6. Review generated task board, then approve `execution_plan`.
7. Watch agents move through states in the pixel office and observe artifacts updating.
8. After `final_deliverables` gate appears, approve it and confirm run status becomes `complete`.
9. Use the replay slider to scrub event history and verify deterministic state reconstruction.

## Project structure

- `src/app/`: Next.js app router and API routes
- `src/components/`: UI shell + mission composer + office renderer
- `src/lib/runtime/`: orchestration engine, projector, scheduler, adapters
- `src/lib/db/`: SQLite client and schema
- `src/lib/types.ts`: normalized public domain interfaces
- `tests/`: unit tests for state projection, provenance, and office mapping

## Runtime data and persistence

- Local runtime data is stored in `.data/` (gitignored)
- SQLite DB: `.data/team-foundry.db`
- Uploaded files: `.data/uploads/<workspace-id>/`

To reset local state:

```bash
rm -rf .data
```

## Git hygiene (important)

The repository ignores local-only files, including:

- build outputs (`.next`, `out`, `build`)
- local DB/runtime artifacts (`.data`, `*.db*`)
- env secrets (`.env*`, with `.env.example` allowed)
- Codex/local AI metadata (`.codex`, codex instruction files)
- macOS metadata (`._*`, `.DS_Store`)

## Troubleshooting

- `database is locked` during builds:
  - fixed in current runtime by lazy DB initialization and busy timeout
  - if still seen, ensure no parallel process is writing the same DB file
- External drives creating `._*` metadata files:
  - these are ignored by git and should not be committed
  - if you need to clean them:

```bash
find . -name '._*' -delete
```

## Publish to GitHub

If your folder is not yet a git repository:

```bash
git init
git add .
git commit -m "Initial Team Foundry v1"
```

Then create a GitHub repository and push:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

## License

MIT. See `LICENSE`.
