/**
 * Writes each stop's prose ahead of time with a Claude model, and keeps it in NARRATION_PATH.
 * Run by hand or from the Narrate workflow, never from the app. Needs ANTHROPIC_API_KEY.
 *   SNAPSHOT_PATH=data/snapshots/addiscombe-2026-10-24.json NARRATE_LIMIT=10 npm run narrate
 * With PROSE_FROM, prose written in a session (see scripts/prompts.ts) is read instead of asked.
 * NARRATE_LIMIT caps the model calls in one run (default 25), nearest START_AT first. Stops whose
 * facts are unchanged keep their prose, so each run continues where the last one stopped.
 * NARRATE_AREA=Shirley narrates only the stops in that area's wards (data/areas.json).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { narrateWorld, type NarrateResult } from '../src/lib/core/narration';
import type { NarrationStore } from '../src/lib/core/render/cached';
import { AnthropicProse } from '../src/lib/server/anthropic';
import { WrittenProse } from '../src/lib/server/written';
import { OpenRouterProse } from '../src/lib/server/openrouter';
import { loadNarration, loadNarrator, readConfig, startStop } from '../src/lib/server/narrator';
import { narrationOnly, narrationWithin } from '../src/lib/server/only';

const config = readConfig();
if (!config) {
	console.error('Set SNAPSHOT_PATH to the snapshot to narrate');
	process.exit(1);
}
const path = config.narrationPath ?? 'data/narration/addiscombe.json';
const store = loadNarration(path);
const narrator = loadNarrator(config);
// Prose written in a session or by a person (PROSE_FROM, a file of key to prose; PROSE_BY, who), another provider's model
// through OpenRouter (NARRATOR_PROVIDER=openrouter, NARRATOR_MODEL), or Claude.
const model = process.env.PROSE_FROM
	? new WrittenProse(process.env.PROSE_FROM, process.env.PROSE_BY)
	: process.env.NARRATOR_PROVIDER === 'openrouter'
		? new OpenRouterProse(process.env.NARRATOR_MODEL ?? '')
		: new AnthropicProse();
const limit = Number(process.env.NARRATE_LIMIT ?? 25);

// NARRATE_ONLY=busier, NARRATE_AREA=Shirley: which stops to write (src/lib/server/only.ts).
const only = narrationOnly(process.env, config.recordsDir);
const within = narrationWithin(process.env, config.recordsDir);
if (process.env.NARRATE_AREA) console.log(`Only ${process.env.NARRATE_AREA}`);

let result: NarrateResult | undefined;
try {
	result = await narrateWorld(narrator, model, store, {
		limit,
		from: startStop(narrator, config).id,
		...(only ? { only } : {}),
		...(within ? { within } : {})
	});
} finally {
	// Keep whatever was written, even if the run stopped part way.
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, JSON.stringify(sorted(store), null, 1) + '\n');
}

console.log(
	`${model.name}: wrote ${result.written}, kept ${result.kept}, ${result.remaining} left for later runs`
);
if (result.declined.length)
	console.log(`Declined, keeping the template: ${result.declined.join(', ')}`);
if (result.rejected.length)
	console.log(`Not stored, keeping the template: ${result.rejected.join(', ')}`);
for (const { stop, phrase } of result.repeated)
	console.log(`  ${stop} used a turn of phrase already in several places: “${phrase}”`);
if (result.skipped) console.log(`${result.skipped} stops left to the template`);
for (const { stop, words } of result.unfounded)
	console.log(`  ${stop} said what its facts do not: ${words.join(', ')}`);

/** Keys in order, so each run's diff shows only what changed. */
function sorted(s: NarrationStore): NarrationStore {
	return Object.fromEntries(Object.entries(s).sort(([a], [b]) => a.localeCompare(b)));
}
