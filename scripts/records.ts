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
import {
	crimeRecords,
	planningRecords,
	plaqueRecords,
	priceRecords,
	protectedRecords
} from '../src/lib/server/sources/more';

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

const snapshot = JSON.parse(readFileSync(`${snapshots}/${newest}`, 'utf8'));
const postcodes = [
	...new Set(
		snapshot.elements
			.map((el: { tags?: Record<string, string> }) =>
				el.tags?.['addr:postcode']?.toUpperCase().trim()
			)
			.filter(Boolean) as string[]
	)
].sort();

/** Every page of a planning.data.gov.uk dataset within the box. */
async function entities(dataset: string) {
	const polygon = `POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))`;
	let url: string | undefined =
		`https://www.planning.data.gov.uk/entity.json?dataset=${dataset}&geometry=${encodeURIComponent(polygon)}&geometry_relation=intersects&limit=500`;
	const all: Record<string, unknown>[] = [];
	while (url) {
		const page = await getJson(url);
		all.push(...(page.entities ?? []));
		url = page.links?.next;
	}
	return { entities: all };
}

type Taken = Omit<RecordStore, 'retrieved'>;
const SOURCES: Record<string, () => Promise<Taken | Taken[]>> = {
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
	},
	/** Listed buildings and protected trees, from planning.data.gov.uk. */
	protected: async () => [
		{
			source: 'Historic England, via planning.data.gov.uk',
			prefix: 'listed',
			records: protectedRecords(await entities('listed-building'), bbox)
		},
		{
			source: 'planning.data.gov.uk',
			prefix: 'tree',
			records: protectedRecords(await entities('tree'), bbox)
		}
	],
	/** Planning applications in the box, from the London Planning Datahub's public search. */
	planning: async () => {
		const search = async (body: unknown) =>
			fetch('https://planningdata.london.gov.uk/api-guest/applications/_search', {
				method: 'POST',
				headers: {
					...headers,
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-API-AllowRequest': 'be2rmRnt&'
				},
				body: JSON.stringify(body)
			});
		// The Datahub's geographic field is not documented: try the likely names in turn.
		for (const field of ['centroid', 'location', 'geo_point', 'point', 'geometry']) {
			const res = await search({
				size: 5000,
				query: {
					bool: {
						filter: [
							{
								geo_bounding_box: {
									[field]: { top_left: { lat: n, lon: w }, bottom_right: { lat: s, lon: e } }
								}
							}
						]
					}
				}
			});
			if (!res.ok) continue;
			console.log(`planning: the Datahub's geographic field is ${field}`);
			return {
				source: 'London Planning Datahub',
				prefix: 'planning',
				records: planningRecords(await res.json(), bbox)
			};
		}
		const sample = await (
			await search({ size: 1, query: { match: { lpa_name: 'Croydon' } } })
		).json();
		throw new Error(
			`no geographic field found; one application has: ${Object.keys(sample?.hits?.hits?.[0]?._source ?? {}).join(', ')}`
		);
	},
	/** Plaques in the box, from Open Plaques. */
	plaques: async () => ({
		source: 'Open Plaques',
		prefix: 'plaque',
		records: plaqueRecords(
			await getJson(`https://openplaques.org/plaques.json?box=[${n},${w}],[${s},${e}]`),
			bbox
		)
	}),
	/** Sales at the snapshot's postcodes, from the Land Registry's Price Paid data. */
	prices: async () => {
		const query = `PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
SELECT ?paon ?street ?amount ?date WHERE {
  VALUES ?postcode { ${postcodes.map((p) => JSON.stringify(p)).join(' ')} }
  ?address lrcommon:postcode ?postcode .
  ?sale lrppi:propertyAddress ?address ; lrppi:pricePaid ?amount ; lrppi:transactionDate ?date .
  ?address lrcommon:paon ?paon ; lrcommon:street ?street .
  FILTER NOT EXISTS { ?address lrcommon:saon ?saon }
}`;
		const res = await fetch('https://landregistry.data.gov.uk/landregistry/query', {
			method: 'POST',
			headers: {
				...headers,
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/sparql-results+json'
			},
			body: new URLSearchParams({ query })
		});
		if (!res.ok)
			throw new Error(`Land Registry answered ${res.status}: ${(await res.text()).slice(0, 500)}`);
		console.log(`prices: asked about ${postcodes.length} postcodes`);
		return { source: 'HM Land Registry', prefix: 'price', records: priceRecords(await res.json()) };
	},
	/** The latest month of street-level crime in the box, from police.uk. */
	crime: async () => ({
		source: 'police.uk',
		prefix: 'crime',
		records: crimeRecords(
			await getJson(
				`https://data.police.uk/api/crimes-street/all-crime?poly=${n},${w}:${n},${e}:${s},${e}:${s},${w}`
			)
		)
	})
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
		const got = await take();
		for (const taken of Array.isArray(got) ? got : [got]) {
			const path = `data/records/${taken.prefix}-${retrieved}.json`;
			writeFileSync(path, JSON.stringify({ ...taken, retrieved }, null, '\t') + '\n');
			console.log(`${key}: ${taken.records.length} records written to ${path}`);
		}
	} catch (err) {
		// One source failing leaves the others' records to be kept.
		console.error(`${key} failed: ${(err as Error).message}`);
		failed++;
	}
}
if (failed === wanted.length) process.exit(1);
