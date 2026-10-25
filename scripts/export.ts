/**
 * Writes the whole game as one self-contained HTML page, for previews or static hosting.
 *   SNAPSHOT_PATH=data/snapshots/addiscombe-2026-10-24.json START_AT=51.379897,-0.074294 npm run export
 * Uses prose written ahead of time when NARRATION_PATH is set. Writes EXPORT_PATH
 * (default build/export/addiscombe.html).
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compileWorld } from '../src/lib/core/adventure/world';
import { exportPage } from '../src/lib/server/export';
import { loadNarrator, readConfig, startStop } from '../src/lib/server/narrator';

const config = readConfig();
if (!config) {
	console.error('Set SNAPSHOT_PATH to the snapshot to export');
	process.exit(1);
}
const narrator = loadNarrator(config);
const world = compileWorld(narrator, startStop(narrator, config).id, {
	asOf: config.snapshotDate
});

const bundle = await build({
	entryPoints: ['src/lib/browser/play.ts'],
	bundle: true,
	format: 'iife',
	globalName: 'AdventureEngine',
	footer: {
		js: 'var Adventure = AdventureEngine.Adventure; var fetchWeatherNow = AdventureEngine.fetchWeatherNow;'
	},
	minify: true,
	target: 'es2020',
	write: false
});

const path = process.env.EXPORT_PATH ?? 'build/export/addiscombe.html';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(
	path,
	exportPage({ engine: bundle.outputFiles[0].text, world, snapshotDate: config.snapshotDate })
);
console.log(`${Object.keys(world.stops).length} stops written to ${path}`);
