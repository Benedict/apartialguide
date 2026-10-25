/**
 * Takes dated copies of other sources' records about the place, into data/records/<prefix>-<date>.json.
 * Run by hand or from the Records workflow, never from the app:
 *   SOURCES=hygiene npm run records
 * The box is the newest snapshot's. Each source's answer is turned into records by a parser in
 * src/lib/server/sources/, tested without the network.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { RecordStore } from '../src/lib/core/adapters/records';
import { hygieneRecords } from '../src/lib/server/sources/hygiene';

const headers = {
	'User-Agent': 'a-partial-guide/0.1 (art project; https://github.com/Benedict/osm-text-adventure)'
};

async function getJson(url: string, extra: Record<string, string> = {}) {
	const res = await fetch(url, { headers: { ...headers, Accept: 'application/json', ...extra } });
	if (!res.ok)
		throw new Error(`${url} answered ${res.status}: ${(await res.text()).slice(0, 500)}`);
	return res.json();
}

const name = process.env.SNAPSHOT_NAME ?? 'addiscombe';
const snapshots = 'data/snapshots';
const newest = readdirSync(snapshots)
	.filter((f) => f.startsWith(name) && f.endsWith('.json'))
	.sort()
	.at(-1)!;
const bbox: string = JSON.parse(readFileSync(`${snapshots}/${newest}`, 'utf8')).bbox;
const [w, s, e, n] = bbox.split(',').map(Number);
const centre = { lat: (s + n) / 2, lon: (w + e) / 2 };
console.log(`box ${bbox}, from ${newest}`);

type Taken = Omit<RecordStore, 'retrieved'>;
const SOURCES: Record<string, () => Promise<Taken>> = {
	/** Food hygiene ratings, from the FSA's ratings API, within about a mile of the middle of the box. */
	hygiene: async () => {
		const answer = await getJson(
			`https://api.ratings.food.gov.uk/Establishments?latitude=${centre.lat}&longitude=${centre.lon}&maxDistanceLimit=1.2&pageSize=5000&pageNumber=1`,
			{ 'x-api-version': '2' }
		);
		return {
			source: 'Food Standards Agency',
			prefix: 'hygiene',
			records: hygieneRecords(answer, bbox)
		};
	}
};

const wanted = (process.env.SOURCES ?? Object.keys(SOURCES).join(','))
	.split(',')
	.map((x) => x.trim());
const retrieved = new Date().toISOString().slice(0, 10);
mkdirSync('data/records', { recursive: true });
let failed = 0;
for (const key of wanted) {
	const take = SOURCES[key];
	if (!take) {
		console.error(`No source called ${key}. There are: ${Object.keys(SOURCES).join(', ')}`);
		failed++;
		continue;
	}
	try {
		const taken = await take();
		const path = `data/records/${taken.prefix}-${retrieved}.json`;
		writeFileSync(path, JSON.stringify({ ...taken, retrieved }, null, '\t') + '\n');
		console.log(`${key}: ${taken.records.length} records written to ${path}`);
	} catch (err) {
		// One source failing leaves the others' records to be kept.
		console.error(`${key} failed: ${(err as Error).message}`);
		failed++;
	}
}
if (failed === wanted.length) process.exit(1);
