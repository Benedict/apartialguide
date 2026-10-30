/**
 * Writes the whole game as one self-contained HTML page, for previews or static hosting.
 *   SNAPSHOT_PATH=data/snapshots/addiscombe-2026-10-24.json START_AT=51.379897,-0.074294 npm run export
 * Uses prose written ahead of time when NARRATION_PATH is set. Writes EXPORT_PATH
 * (default build/export/addiscombe.html).
 *
 * With SITE_DIR set it writes the site instead: the microsite at SITE_DIR/index.html, and the walk at
 * SITE_DIR/walk/, its index.html carrying only the head, the world in tiles (walk/tiles/<key>.json,
 * TILE_M metres across, default 300) fetched as the walk reaches them, and the street network
 * (walk/routes.json) fetched when a way is first asked for. GA_MEASUREMENT_ID adds Google Analytics,
 * counted only once a reader says yes.
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Adventure } from '../src/lib/core/adventure/engine';
import { tileWorld } from '../src/lib/core/adventure/tiles';
import { landingPage } from '../src/lib/server/landing';
import { notFoundPage } from '../src/lib/server/notfound';
import { FONT_FILES } from '../src/lib/server/type';
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
	// The walk at walk/, in tiles; the microsite at the root, its way in.
	const walk = join(site, 'walk');
	const { head, tiles, routes } = tileWorld(world, Number(process.env.TILE_M ?? 300));
	mkdirSync(join(walk, 'tiles'), { recursive: true });
	for (const [key, tile] of Object.entries(tiles))
		writeFileSync(join(walk, 'tiles', `${key}.json`), JSON.stringify(tile));
	writeFileSync(join(walk, 'routes.json'), JSON.stringify(routes));
	writeFileSync(
		join(walk, 'index.html'),
		exportPage({
			engine,
			world: { ...head, stops: {} },
			snapshotDate: config.snapshotDate,
			flightsUrl: process.env.FLIGHTS_URL,
			gaId: process.env.GA_MEASUREMENT_ID || undefined,
			siteUrl: process.env.SITE_URL || undefined,
			tiles: 'tiles/'
		})
	);
	writeFileSync(join(site, 'index.html'), await microsite());
	writeFileSync(join(site, '404.html'), notFoundPage());
	// The type, with its licence, as the Open Font License asks.
	mkdirSync(join(site, 'fonts'), { recursive: true });
	for (const file of FONT_FILES)
		copyFileSync(join('static', 'fonts', file), join(site, 'fonts', file));
	// The brand's pictures, drawn by `npm run brand`: the home-screen icon and the preview image.
	for (const picture of ['apple-touch-icon.png', 'og.png'])
		copyFileSync(join('static', picture), join(site, picture));
	console.log(
		`${Object.keys(world.stops).length} stops written to ${walk} in ${Object.keys(tiles).length} tiles, and the microsite to ${site}`
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

/** The microsite: what the piece is, the start of the walk as it plays, and the way in. */
async function microsite(): Promise<string> {
	const bundle = await build({
		entryPoints: ['src/lib/browser/landing.ts'],
		bundle: true,
		format: 'iife',
		globalName: 'LandingPage',
		minify: true,
		target: 'es2020',
		write: false
	});
	// The tour's first place, played at noon on the map's date, so the lamps are out and it reads the same each build.
	const game = new Adventure(world);
	game.clock = () => new Date(`${config!.snapshotDate}T12:00:00Z`);
	game.begin();
	const first = game.respond('take the tour');
	return landingPage({
		snapshotDate: config!.snapshotDate,
		about: world.about!,
		excerpt: [
			{ said: 'take the tour' },
			{ title: first.title, lines: first.lines.filter((l) => !l.startsWith('Exits:')) }
		],
		script: bundle.outputFiles[0].text,
		gaId: process.env.GA_MEASUREMENT_ID || undefined,
		siteUrl: process.env.SITE_URL || undefined
	});
}
