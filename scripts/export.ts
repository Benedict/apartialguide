/**
 * Writes the whole game as one self-contained HTML page, for previews or static hosting.
 *   SNAPSHOT_PATH=data/snapshots/addiscombe-2026-10-24.json START_AT=51.379897,-0.074294 npm run export
 * Uses prose written ahead of time when NARRATION_PATH is set. Writes EXPORT_PATH
 * (default build/export/addiscombe.html).
 *
 * With SITE_DIR set it writes the site instead: SITE_DIR/index.html carrying only the head, and the
 * world in tiles (SITE_DIR/tiles/<key>.json, TILE_M metres across, default 300) that the page
 * fetches as the walk reaches them, so it opens at once however large the map.
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tileWorld } from '../src/lib/core/adventure/tiles';
import { compileWorld } from '../src/lib/core/adventure/world';
import { exportPage, wordsAmiss } from '../src/lib/server/export';
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

const amiss = wordsAmiss(world);
if (amiss.length) {
	console.error(`Guide would say what the code let slip, at ${amiss.length} places:`);
	for (const line of amiss.slice(0, 10)) console.error(`  ${line.slice(0, 200)}`);
	process.exit(1);
}

const bundle = await build({
	entryPoints: ['src/lib/browser/play.ts'],
	bundle: true,
	format: 'iife',
	globalName: 'AdventureEngine',
	footer: {
		// Everything play.ts exports becomes a global for the page's script, so the two cannot drift.
		js: 'Object.assign(globalThis, AdventureEngine);'
	},
	minify: true,
	target: 'es2020',
	write: false
});

const engine = bundle.outputFiles[0].text;
const site = process.env.SITE_DIR;
if (site) {
	const { head, tiles, routes } = tileWorld(world, Number(process.env.TILE_M ?? 300));
	mkdirSync(join(site, 'tiles'), { recursive: true });
	for (const [key, tile] of Object.entries(tiles))
		writeFileSync(join(site, 'tiles', `${key}.json`), JSON.stringify(tile));
	writeFileSync(join(site, 'routes.json'), JSON.stringify(routes));
	writeFileSync(
		join(site, 'index.html'),
		exportPage({
			engine,
			world: { ...head, stops: {} },
			snapshotDate: config.snapshotDate,
			flightsUrl: process.env.FLIGHTS_URL,
			tiles: 'tiles/'
		})
	);
	console.log(
		`${Object.keys(world.stops).length} stops written to ${site} in ${Object.keys(tiles).length} tiles`
	);
} else {
	const path = process.env.EXPORT_PATH ?? 'build/export/addiscombe.html';
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(
		path,
		exportPage({
			engine,
			world,
			snapshotDate: config.snapshotDate,
			flightsUrl: process.env.FLIGHTS_URL
		})
	);
	console.log(`${Object.keys(world.stops).length} stops written to ${path}`);
}
