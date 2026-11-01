/**
 * The Roman spike: Digital Britannia's roads and sites in a box (ROMAN_BOX, the South-East unless
 * told) as a walk of their own, played ten moves from London into build/roman/transcript.md, and
 * written as one page, build/roman/roman.html. Not linked from anywhere.
 *   BRITANNIA_GPKG=… npm run roman:spike
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Adventure } from '../src/lib/core/adventure/engine';
import { exportPage } from '../src/lib/server/export';
import { readGpkgLayer } from '../src/lib/server/gpkg';
import { BRITANNIA_TABLES } from '../src/lib/server/sources/britannia';
import { romanWorld, type RomanLayers } from '../src/lib/roman/world';

const gpkg = process.env.BRITANNIA_GPKG;
if (!gpkg) throw new Error('roman:spike needs BRITANNIA_GPKG');
const [w, s, e, n] = (process.env.ROMAN_BOX ?? '-1.6,50.6,1.6,51.9').split(',').map(Number);
const inBox = (c: unknown): boolean =>
	Array.isArray(c) && typeof c[0] === 'number'
		? c[0] >= w && c[0] <= e && c[1] >= s && c[1] <= n
		: Array.isArray(c) && c.some(inBox);

const layers = Object.fromEntries(
	Object.entries(BRITANNIA_TABLES).map(([key, table]) => [
		key,
		{
			features: readGpkgLayer(gpkg, table).features.filter(
				(f) => f.geometry && inBox(f.geometry.coordinates)
			)
		}
	])
) as RomanLayers;

// The roads' confidence in the layer's own words, from the style it is drawn with.
const db = new DatabaseSync(gpkg, { readOnly: true });
const style = (
	db
		.prepare("SELECT styleQML FROM layer_styles WHERE f_table_name = 'Engineered Roman roads'")
		.get() as {
		styleQML: string;
	}
).styleQML;
const dated = (
	db
		.prepare("SELECT last_change FROM gpkg_contents WHERE table_name = 'Engineered Roman roads'")
		.get() as {
		last_change: string;
	}
).last_change.slice(0, 10);
db.close();
const confidence = Object.fromEntries(
	[...style.matchAll(/<category label="([^"]+)"[^>]*value="(\d+)"/g)].map(([, label, value]) => [
		value,
		label
	])
);

const built = romanWorld(layers, { confidence, start: 'London' });
const [latitude, longitude] = built.stops[built.start].at!;
// Today's weather, asked where the walk begins, as the borough's walk does.
const world = { ...built, asOf: dated, weatherAt: { latitude, longitude } };
const stops = Object.values(world.stops);
console.log(
	`${stops.length} stops; ${stops.filter((x) => x.paragraphs.length > 2).length} with a site; ways per stop: ${(stops.reduce((a, x) => a + x.exits.length, 0) / stops.length).toFixed(1)}`
);

// Ten moves from London, each the first way not yet taken, as a reader trying the roads might.
const game = new Adventure(world);
const out: string[] = [];
const say = (cmd: string) => {
	const r = game.respond(cmd);
	out.push(
		`> ${cmd}`,
		'',
		...(r.title ? [`**${r.title}**`, ''] : []),
		...r.lines.map((l) => `${l}\n`)
	);
	return r;
};
out.push(...game.begin().flatMap((r) => r.lines.map((l) => `${l}\n`)));
say('take the tour');
const seen = new Set<string>();
for (let k = 0; k < 10; k++) {
	const here = (game as unknown as { walk: { here: string } }).walk.here;
	seen.add(here);
	const exits = world.stops[here].exits;
	const next = exits.find((x) => !seen.has(x.to)) ?? exits[0];
	if (!next) break;
	say(next.label);
}
mkdirSync('build/roman', { recursive: true });
writeFileSync('build/roman/transcript.md', out.join('\n'));

const engine = (
	await build({
		entryPoints: ['src/lib/browser/play.ts'],
		bundle: true,
		format: 'iife',
		globalName: 'AdventureEngine',
		footer: { js: 'Object.assign(globalThis, AdventureEngine);' },
		minify: true,
		target: 'es2020',
		write: false
	})
).outputFiles[0].text;
writeFileSync(
	'build/roman/roman.html',
	exportPage({
		engine,
		world,
		snapshotDate: dated,
		noindex: true,
		place: { name: 'Roman Britain' }
	})
);
console.log('build/roman/transcript.md, build/roman/roman.html');
