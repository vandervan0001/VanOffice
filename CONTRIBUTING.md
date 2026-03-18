# Contributing to Team Foundry

Thanks for your interest in contributing! This project is 100% vibecoded and we'd love to keep that energy going.

## Getting started

```bash
git clone https://github.com/vandervan0001/VanOffice.git
cd VanOffice
npm install
npm run dev
```

Open http://localhost:3000 and play with the presets to understand the flow.

## Development workflow

```bash
npm run dev          # Start dev server (localhost:3000)
npm test             # Run all tests (vitest)
npm run lint         # ESLint
npm run build        # Production build
npm run test:watch   # Watch mode for tests
```

## Project architecture

The app has two layers:

**Truth layer** (don't change unless necessary):
- `src/lib/runtime/` — engine, projector, scheduler, adapters
- `src/lib/db/` — SQLite persistence
- `src/lib/types.ts` — domain types
- `src/app/api/` — REST + SSE endpoints

**Render layer** (where most contributions happen):
- `src/components/office/` — pixel office, agents, furniture
- `src/components/composer/` — mission brief form
- `src/components/sidebar/` — approval gates
- `src/components/outputs/` — artifact cards

## How to add new furniture

1. Open `src/components/office/furniture.tsx`
2. Create a new SVG function (e.g., `VendingMachineSprite`)
3. Add the type to `FurnitureProps["type"]`
4. Register it in `FURNITURE_RENDERERS` with width/height in grid cells
5. Place it in `src/components/office/office-view.tsx`
6. Run tests: `npm test`

## How to add a new preset

1. Open `src/components/composer/mission-composer.tsx`
2. Add an entry to the `DEMO_PRESETS` array
3. Include: id, label, goal, outputs, brief (with context, mission, constraints, audience, success criteria)

## How to add agent accessories

1. Open `src/components/office/agent-sprite.tsx`
2. Extend the `AgentAppearance` interface with new accessory types
3. Add rendering in the `Accessory` component
4. Update `AGENT_APPEARANCES` and fallback in `getAppearance()`

## Code style

- TypeScript strict mode
- Tailwind CSS for styling (use CSS variables from globals.css)
- Inline SVGs for all pixel-art (no external image files for furniture/agents)
- Components are functional React with hooks
- Tests use Vitest + Testing Library

## Pull requests

- Open an issue first for major changes
- Keep PRs focused — one feature or fix per PR
- Run `npm test && npm run build` before submitting
- Add tests for new functionality when applicable

## Good first issues

Look for issues labeled `good first issue` or check the README roadmap for ideas.
