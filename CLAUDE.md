# Addiscombe Narrator

A text "street view" of Addiscombe, Croydon. One narrator, Guide, describes the place from open data, and its confusion is earned by that data. It is an art piece, not a game. The spec lives in the project doc "Addiscombe Narrator: spec sketch".

## Hard rules

- Never invent a fact. Guide speaks only from facts a source adapter returned. Phrases around the facts are Guide's; nouns, names, numbers and dates come from facts.
- Every fact carries provenance: source, subject, observed date.
- Never repair data. Broken values ("est Bank") are spoken as found.
- Never edit OpenStreetMap. Gaps stay as found.
- Never call public Overpass, or any OSM API, from the app. Snapshots are taken by hand with `npm run snapshot`.
- Write the failing scenario or test before the code.
- Real places come only from dated snapshots in `data/snapshots/`. Test fixtures are synthetic and must not pose as real Addiscombe data.

## Commands

- `npm test`: unit tests (Vitest), then acceptance scenarios (Cucumber).
- `npm run test:acceptance`: Gherkin in `features/`. `@snapshot` scenarios run only once the snapshot file exists; `@icebox` and `@later` never run.
- `npm run lint`, `npm run check`: Prettier, ESLint, svelte-check.
- `npm run dev`: needs `SNAPSHOT_PATH` (see `.env.example`).
- `BBOX=minLon,minLat,maxLon,maxLat npm run snapshot`: writes `data/snapshots/addiscombe-<date>.json`.

## Layout

The core in `src/lib/core/` is plain TypeScript with no framework imports, so Cucumber can load it directly.

- `osm.ts`: snapshot format and index.
- `adapters/`: one `SourceAdapter` per source, each returning `Fact`s (`facts.ts`).
- `stops.ts`: street graph to stops. Junctions plus corridor stops at most `spacing` metres apart; exits named by compass point.
- `perception.ts`: facts within reach, occluded by mapped buildings.
- `tensions.ts`: conditions in the data (fragment, dated, sparse, dense).
- `slippage.ts`: tensions to a `NarrationPlan` of beats and effects.
- `render/`: `Renderer` port. `TemplateRenderer` now; a model renderer later, given only the plan's facts.
- `narrator.ts`: wires the pipeline.

The web reader is SvelteKit (`src/routes/`). Each stop is a URL and its exits are links. Configuration comes from environment variables only.
