/**
 * Drops from NARRATION_PATH every piece kept for facts no stop of the map has now: prose kept for a
 * name, a sale or a record since taken out, or for a place that has since changed. Run after the
 * suppression list or the records change, over the whole map:
 *   SNAPSHOT_PATH=… RECORDS_DIR=data/records NARRATION_PATH=data/narration/addiscombe.json npm run narrate:prune
 * Then `npm run narrate` writes the places that lost theirs again.
 */
import { writeFileSync } from 'node:fs';
import { pruneNarration } from '../src/lib/core/narration';
import type { NarrationStore } from '../src/lib/core/render/cached';
import { loadNarration, loadNarrator, readConfig } from '../src/lib/server/narrator';

const config = readConfig();
if (!config?.narrationPath) {
	console.error('Set SNAPSHOT_PATH and NARRATION_PATH');
	process.exit(1);
}
const store = loadNarration(config.narrationPath);
const before = Object.keys(store).length;
const gone = pruneNarration(loadNarrator(config), store);
const sorted = (s: NarrationStore) =>
	Object.fromEntries(Object.entries(s).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(config.narrationPath, JSON.stringify(sorted(store), null, 1) + '\n');
console.log(`Kept ${before - gone.length} of ${before} pieces; dropped ${gone.length}.`);
