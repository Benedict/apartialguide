/**
 * Writes each stop's prose ahead of time with a Claude model, and keeps it in NARRATION_PATH.
 * Run by hand or from the Narrate workflow, never from the app. Needs ANTHROPIC_API_KEY.
 *   SNAPSHOT_PATH=data/snapshots/addiscombe-2026-10-24.json NARRATE_LIMIT=10 npm run narrate
 * With PROSE_FROM, prose written in a session (see scripts/prompts.ts) is read instead of asked.
 * NARRATE_LIMIT caps the model calls in one run (default 25), nearest START_AT first. Stops whose
 * facts are unchanged keep their prose, so each run continues where the last one stopped.
 * NARRATE_AREA=Shirley narrates only the stops in that area's wards (data/areas.json).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isBusier } from '../src/lib/core/busier';
import type { Scene } from '../src/lib/core/scene';
import { areaWards, inArea, type AreaList } from '../src/lib/core/release';
import { narrateWorld, type NarrateResult } from '../src/lib/core/narration';
import type { NarrationStore } from '../src/lib/core/render/cached';
import { AnthropicProse } from '../src/lib/server/anthropic';
import { WrittenProse } from '../src/lib/server/written';
import { OpenRouterProse } from '../src/lib/server/openrouter';
import {
	loadNarration,
	loadNarrator,
	loadRecords,
	readConfig,
	startStop
} from '../src/lib/server/narrator';

const config = readConfig();
if (!config) {
	console.error('Set SNAPSHOT_PATH to the snapshot to narrate');
	process.exit(1);
}
const path = config.narrationPath ?? 'data/narration/addiscombe.json';
const store = loadNarration(path);
const narrator = loadNarrator(config);
// Prose written in a session (PROSE_FROM, a file of key to prose), another provider's model
// through OpenRouter (NARRATOR_PROVIDER=openrouter, NARRATOR_MODEL), or Claude.
const model = process.env.PROSE_FROM
	? new WrittenProse(process.env.PROSE_FROM)
	: process.env.NARRATOR_PROVIDER === 'openrouter'
		? new OpenRouterProse(process.env.NARRATOR_MODEL ?? '')
		: new AnthropicProse();
const limit = Number(process.env.NARRATE_LIMIT ?? 25);

// NARRATE_ONLY=busier narrates only stops whose data has something going on; NARRATE_AREA only
// the stops in one area's wards.
const tests: ((scene: Scene) => boolean)[] = [];
if (process.env.NARRATE_ONLY === 'busier') tests.push(isBusier);
if (process.env.NARRATE_AREA) {
	const areas: AreaList = JSON.parse(readFileSync('data/areas.json', 'utf8')).areas;
	const wards = loadRecords(config.recordsDir).flatMap((store) => store.areas ?? []);
	const inside = inArea(wards, areaWards(areas, process.env.NARRATE_AREA));
	tests.push((scene) => inside(scene.position));
	console.log(`Only ${process.env.NARRATE_AREA}`);
}

let result: NarrateResult | undefined;
try {
	result = await narrateWorld(narrator, model, store, {
		limit,
		from: startStop(narrator, config).id,
		...(tests.length ? { only: (scene: Scene) => tests.every((test) => test(scene)) } : {})
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
