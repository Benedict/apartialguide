/**
 * Writes each stop's prose ahead of time with a Claude model, and keeps it in NARRATION_PATH.
 * Run by hand or from the Narrate workflow, never from the app. Needs ANTHROPIC_API_KEY.
 *   SNAPSHOT_PATH=data/snapshots/addiscombe-2026-10-24.json NARRATE_LIMIT=10 npm run narrate
 * NARRATE_LIMIT caps the model calls in one run (default 25), nearest START_AT first. Stops whose
 * facts are unchanged keep their prose, so each run continues where the last one stopped.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { narrateWorld, type NarrateResult } from '../src/lib/core/narration';
import type { NarrationStore } from '../src/lib/core/render/cached';
import { AnthropicProse } from '../src/lib/server/anthropic';
import { loadNarration, loadNarrator, readConfig, startStop } from '../src/lib/server/narrator';

const config = readConfig();
if (!config) {
	console.error('Set SNAPSHOT_PATH to the snapshot to narrate');
	process.exit(1);
}
const path = config.narrationPath ?? 'data/narration/addiscombe.json';
const store = loadNarration(path);
const narrator = loadNarrator(config);
const model = new AnthropicProse();
const limit = Number(process.env.NARRATE_LIMIT ?? 25);

let result: NarrateResult | undefined;
try {
	result = await narrateWorld(narrator, model, store, {
		limit,
		from: startStop(narrator, config).id
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
	console.log(`Repaired a broken name, keeping the template: ${result.rejected.join(', ')}`);

/** Keys in order, so each run's diff shows only what changed. */
function sorted(s: NarrationStore): NarrationStore {
	return Object.fromEntries(Object.entries(s).sort(([a], [b]) => a.localeCompare(b)));
}
