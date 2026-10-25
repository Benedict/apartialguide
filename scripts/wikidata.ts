/**
 * Takes a dated copy of what Wikidata holds about the place, for the Wikidata adapter. Run by hand
 * or from the Wikidata workflow, never from the app:
 *   BBOX=minLon,minLat,maxLon,maxLat npm run wikidata
 * Takes every item the snapshot links to (wikidata, name:etymology:wikidata) and every item
 * Wikidata places in the box. Writes data/wikidata/<SNAPSHOT_NAME>-<today>.json.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { WikidataStore } from '../src/lib/core/adapters/wikidata';
import { itemFromEntity, qidsInSnapshot, type WikidataEntity } from '../src/lib/server/wikidata';

const headers = {
	'User-Agent': 'a-partial-guide/0.1 (art project; https://github.com/Benedict/osm-text-adventure)',
	Accept: 'application/json'
};

async function get(url: string) {
	const res = await fetch(url, { headers });
	if (!res.ok) {
		console.error(`Wikidata answered ${res.status} for ${url}: ${await res.text()}`);
		process.exit(1);
	}
	return res.json();
}

const name = process.env.SNAPSHOT_NAME ?? 'addiscombe';
const snapshots = 'data/snapshots';
const snapshotPath =
	process.env.SNAPSHOT_PATH ??
	`${snapshots}/${readdirSync(snapshots)
		.filter((f) => f.startsWith(name) && f.endsWith('.json'))
		.sort()
		.at(-1)}`;
const bbox = process.env.BBOX?.split(',').map(Number);
if (!bbox || bbox.length !== 4 || bbox.some((v) => !Number.isFinite(v))) {
	console.error('Set BBOX=minLon,minLat,maxLon,maxLat');
	process.exit(1);
}
const [west, south, east, north] = bbox;

const linked = qidsInSnapshot(JSON.parse(readFileSync(snapshotPath, 'utf8')));
const sparql = `SELECT ?item WHERE { SERVICE wikibase:box { ?item wdt:P625 ?where .
  bd:serviceParam wikibase:cornerSouthWest "Point(${west} ${south})"^^geo:wktLiteral .
  bd:serviceParam wikibase:cornerNorthEast "Point(${east} ${north})"^^geo:wktLiteral . } }`;
const answer = await get(
	`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
);
const placed: string[] = answer.results.bindings.map((b: { item: { value: string } }) =>
	b.item.value.replace(/^.*\//, '')
);
const qids = [...new Set([...linked, ...placed])];
console.log(
	`${linked.length} items linked from ${snapshotPath}, ${placed.length} placed in the box`
);

const items: WikidataStore['items'] = {};
for (let i = 0; i < qids.length; i += 50) {
	const ids = qids.slice(i, i + 50).join('|');
	const { entities } = await get(
		`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|descriptions|claims&languages=en|en-gb&ids=${ids}`
	);
	for (const [qid, entity] of Object.entries(entities as Record<string, WikidataEntity>)) {
		const item = itemFromEntity(entity);
		if (Object.keys(item).length) items[qid] = item;
	}
}

const retrieved = new Date().toISOString().slice(0, 10);
const store: WikidataStore & { bbox: number[]; snapshot: string } = {
	retrieved,
	bbox,
	snapshot: snapshotPath,
	items
};
mkdirSync('data/wikidata', { recursive: true });
const path = `data/wikidata/${name}-${retrieved}.json`;
writeFileSync(path, JSON.stringify(store, null, '\t') + '\n');
console.log(`${Object.keys(items).length} items written to ${path}`);
