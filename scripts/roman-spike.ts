/**
 * The Roman spike: Digital Britannia's roads, the Wall and its sites in a box as a walk of their own,
 * site to site, played ten moves from a start into build/roman/<name>-transcript.md, scored against
 * the spike's measures, and written as one page, build/roman/<name>.html. Not linked from anywhere.
 *   BRITANNIA_GPKG=… WALLCAP_DB=… npm run roman:spike   (the Wall, from Wallsend)
 *   ROMAN_AREA=south-east BRITANNIA_GPKG=… npm run roman:spike
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Adventure } from '../src/lib/core/adventure/engine';
import { exportPage } from '../src/lib/server/export';
import { readGpkgLayer } from '../src/lib/server/gpkg';
import { BRITANNIA_TABLES } from '../src/lib/server/sources/britannia';
import { romanWorld, type RomanLayers } from '../src/lib/roman/world';
import { ROMAN_SOURCES } from '../src/lib/roman/sources';
import { wallcapAccounts } from '../src/lib/roman/wallcap';
import { parseCsv } from '../src/lib/server/sources/trees';
import { execFileSync } from 'node:child_process';

const gpkg = process.env.BRITANNIA_GPKG;
if (!gpkg) throw new Error('roman:spike needs BRITANNIA_GPKG');
const AREAS: Record<string, { box: string; start: string }> = {
	// The Wall, with the Stanegate and the Military Way beside it, and Dere Street from Binchester to
	// High Rochester across it.
	wall: { box: '-3.3,54.65,-1.4,55.3', start: 'Wallsend' },
	'south-east': { box: '-1.6,50.6,1.6,51.9', start: 'London' }
};
const area = process.env.ROMAN_AREA ?? 'wall';
const { box, start } = AREAS[area];
const [w, s, e, n] = box.split(',').map(Number);
const inBox = (c: unknown): boolean =>
	Array.isArray(c) && typeof c[0] === 'number'
		? c[0] >= w && c[0] <= e && c[1] >= s && c[1] <= n
		: Array.isArray(c) && c.some(inBox);

const TABLES = {
	...BRITANNIA_TABLES,
	walls: "Antonine and Hadrian's Walls",
	milecastles: 'Hadrians_Wall_milecastle'
};
const layers = Object.fromEntries(
	Object.entries(TABLES).map(([key, table]) => [
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

// WallCAP's own tables, where given (WALLCAP_DB, its database as downloaded from the ADS): each
// milecastle's account whole, and its history.
const wallcap = process.env.WALLCAP_DB;
const table = (name: string) =>
	parseCsv(
		execFileSync('unzip', ['-p', wallcap!, `WallCAP_database_18_09_2022-${name}.csv`], {
			maxBuffer: 1 << 26
		}).toString('utf8')
	);
const accounts = wallcap ? wallcapAccounts(table('Milecastle'), table('Core_Data')) : {};
if (wallcap) console.log(`wallcap: ${Object.keys(accounts).length} milecastles' accounts`);
const built = romanWorld(layers, { confidence, start, accounts });
const [latitude, longitude] = built.stops[built.start].at!;
// Today's weather, asked where the walk begins, as the borough's walk does.
const world = { ...built, asOf: dated, weatherAt: { latitude, longitude } };
const stops = Object.values(world.stops);
console.log(
	`${area}: ${stops.length} places; ways per place: ${(stops.reduce((a, x) => a + x.exits.length, 0) / stops.length).toFixed(1)}`
);

const sentences = (t: string) =>
	t
		.split(/(?<=[.”])\s+(?=[A-Z“])/)
		.map((x) => x.trim())
		.filter(Boolean);

// Ten moves from the start, each the first way not yet taken, as a reader trying the roads might.
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
const toldAt: string[][] = [];
const keep = (lines: string[]) => lines.filter((l) => !/^(Ways:|You have walked|Hint:)/.test(l));
toldAt.push(keep(say('take the tour').lines));
const here = () => (game as unknown as { walk: { here: string } }).walk.here;
const visited = [here()];
const chosen: string[] = [];
const states: string[] = [];
/** What is kept of a place, beyond its name and its account: its kind, status, condition, ages, finds. */
const stateOf = (id: string) =>
	sentences(world.stops[id].paragraphs[0] ?? '')
		.map((l) => l.match(/^[^:“]+: (.*)$/)?.[1] ?? '')
		.filter((l) => l && !l.startsWith('“'))
		.sort()
		.join(' | ');
states.push(stateOf(here()));
for (let k = 0; k < 10; k++) {
	const stop = world.stops[here()];
	const next = stop.exits.find((x) => !visited.includes(x.to)) ?? stop.exits[0];
	if (!next) break;
	const waysLine = stop.paragraphs.at(-1) ?? '';
	chosen.push(
		waysLine
			.replace(/^Ways: /, '')
			.split(' · ')
			.find((part) => part.startsWith(`${next.label},`)) ?? ''
	);
	toldAt.push(keep(say(next.label).lines));
	visited.push(here());
	states.push(stateOf(here()));
}

// The measures, set before the build: what would show the data can carry a walk of its own.

const rich = stops.filter((x) => sentences(x.paragraphs.slice(0, -1).join(' ')).length >= 3).length;
// What the reader is told at each place on the walk, as told: the engine leaves out what was just heard.
let repeats = 0;
for (let k = 1; k < toldAt.length; k++) {
	const before = new Set(sentences(toldAt[k - 1].join(' ')));
	repeats += sentences(toldAt[k].join(' ')).filter((l) => before.has(l)).length;
}
const changed = chosen.filter((c) => /, then |; then |, into /.test(c)).length;
const differs = chosen.filter(
	(c, k) => /, then |; then |, into /.test(c) || states[k + 1] !== states[k]
).length;
const measures = [
	`Places with two or more facts beyond a name (three or more sentences): ${rich} of ${stops.length} (${Math.round((100 * rich) / stops.length)}%; wanted 80%)`,
	`Sentences said again at the next place on the walk: ${repeats} (wanted 0)`,
	`Moves whose stage carries a change (certainty, road, county): ${changed} of ${chosen.length} (wanted 7 of 10; the first round's measure, for roads)`,
	`Moves to a place kept differently from the last (kind, status, condition, ages, finds), or along a stage that changes: ${differs} of ${chosen.length} (wanted 7 of 10; fitted to the Wall)`
];
console.log(measures.join('\n'));
mkdirSync('build/roman', { recursive: true });
writeFileSync(`build/roman/${area}-world.json`, JSON.stringify(world, null, 1));
writeFileSync(
	`build/roman/${area}-transcript.md`,
	[`# ${area}: ten moves from ${start}`, '', ...measures.map((m) => `- ${m}`), '', ...out].join(
		'\n'
	)
);

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
	`build/roman/${area}.html`,
	exportPage({
		engine,
		world,
		sources: ROMAN_SOURCES,
		snapshotDate: dated,
		noindex: true,
		place: { name: area === 'wall' ? 'the Wall' : 'Roman Britain' }
	})
);
console.log(`build/roman/${area}-transcript.md, build/roman/${area}.html`);
