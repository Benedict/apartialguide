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
import { wardAreas } from '../src/lib/server/sources/wards';
import { parseCsv, rowInBox, treeRecords } from '../src/lib/server/sources/trees';
import { benchRecords } from '../src/lib/server/sources/benches';

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
	}),
	/**
	 * Ward boundaries from the ONS Open Geography Portal, for the wards the box touches. The newest
	 * published layer that answers is taken; its name is not documented the same way twice.
	 */
	wards: async () => {
		const layers = [
			'Wards_December_2025_Boundaries_UK_BGC',
			'Wards_May_2025_Boundaries_UK_BGC',
			'Wards_December_2024_Boundaries_UK_BGC',
			'Wards_May_2024_Boundaries_UK_BGC',
			'Wards_December_2023_Boundaries_UK_BGC',
			'WD_DEC_2024_UK_BGC',
			'WD_DEC_2023_UK_BGC'
		];
		const query =
			`query?where=1%3D1&geometry=${w},${s},${e},${n}&geometryType=esriGeometryEnvelope&inSR=4326` +
			'&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=geojson';
		for (const layer of layers) {
			const url = `https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/${layer}/FeatureServer/0/${query}`;
			try {
				const answer = await getJson(url);
				const areas = wardAreas(answer);
				if (!areas.length) throw new Error(`no wards: ${JSON.stringify(answer).slice(0, 300)}`);
				console.log(`wards: from ${layer}`);
				return {
					source: `Office for National Statistics (${layer})`,
					prefix: 'ward',
					records: [],
					areas
				};
			} catch (err) {
				console.log(`wards: ${layer} did not answer: ${(err as Error).message.slice(0, 200)}`);
			}
		}
		throw new Error('no ward layer answered');
	},
	/** Benches and their inscriptions, from OpenBenches: whichever of its feeds answers first. */
	benches: async () => {
		const radiusKm = Math.ceil(
			Math.max((e - w) * 111 * Math.cos((centre.lat * Math.PI) / 180), (n - s) * 111) / 2 + 1
		);
		for (const url of [
			`https://openbenches.org/api/nearest/?latitude=${centre.lat}&longitude=${centre.lon}&distance=${radiusKm}&truncated=false`,
			'https://openbenches.org/api/benches?truncated=false',
			`https://openbenches.org/api/v1.0/data.json/?latitude=${centre.lat}&longitude=${centre.lon}&radius=${radiusKm}&truncated=false&format=raw`
		]) {
			try {
				const answer = await getJson(url);
				console.log(
					`benches: ${url} gave ${answer.features?.length ?? 0} features; first ${JSON.stringify(answer.features?.[0]).slice(0, 400)}`
				);
				const records = benchRecords(answer, bbox);
				// A search may cut inscriptions short; each cut one is asked for whole, bench by bench.
				for (const [i, r] of records.entries()) {
					if (!r.claims.inscription.endsWith('…')) continue;
					try {
						const whole = benchRecords(
							await getJson(`https://openbenches.org/api/bench/${r.id}?truncated=false`),
							bbox
						)[0];
						if (whole) records[i] = whole;
					} catch (err) {
						console.log(
							`benches: bench ${r.id} whole did not answer: ${(err as Error).message.slice(0, 120)}`
						);
					}
				}
				if (records.length) return { source: 'OpenBenches', prefix: 'bench', records };
			} catch (err) {
				console.log(`benches: ${url} did not answer: ${(err as Error).message.slice(0, 200)}`);
			}
		}
		throw new Error('no OpenBenches feed answered with benches in the box');
	},
	/** Trees the boroughs list, from the GLA's London Datastore, counted along each named street. */
	trees: async () => {
		const streets = namedStreets();
		for (const slug of ['london-public-realm-trees-2r45m', 'local-authority-maintained-trees']) {
			for (const csv of await datastoreCsvs(slug)) {
				const res = await fetch(csv.url, { headers });
				if (!res.ok) {
					console.log(`trees: ${csv.url} answered ${res.status}`);
					continue;
				}
				const rows = parseCsv(await res.text(), (row) => rowInBox(row, bbox));
				console.log(
					`trees: ${csv.title}: ${rows.length} rows in the box; columns ${Object.keys(rows[0] ?? {}).join(', ')}`
				);
				console.log(`trees: first row ${JSON.stringify(rows[0])}`);
				const records = treeRecords(rows, bbox, streets);
				if (records.length)
					return { source: `Greater London Authority, ${csv.title}`, prefix: 'trees', records };
			}
		}
		throw new Error('no tree list answered with trees in the box');
	}
};

/** The snapshot's named streets, as lines, for counting what stands along each. */
function namedStreets() {
	const at = new Map<number, [number, number]>();
	for (const el of snapshot.elements)
		if (el.type === 'node' && el.lat !== undefined) at.set(el.id, [el.lat, el.lon]);
	return snapshot.elements
		.filter(
			(el: { type: string; tags?: Record<string, string> }) =>
				el.type === 'way' && el.tags?.highway && el.tags?.name
		)
		.map((el: { tags: Record<string, string>; nodes: number[] }) => ({
			name: el.tags.name,
			line: el.nodes.map((id) => at.get(id)).filter(Boolean) as [number, number][]
		}));
}

/** The London Datastore's CSV files for a dataset, found through its API, whichever answers. */
async function datastoreCsvs(slug: string): Promise<{ title: string; url: string }[]> {
	for (const api of [
		`https://data.london.gov.uk/api/dataset/${slug}`,
		`https://data.london.gov.uk/api/action/package_show?id=${slug}`
	]) {
		try {
			const answer = await getJson(api);
			const body = answer.result ?? answer;
			const resources = Array.isArray(body.resources)
				? body.resources
				: Object.values(body.resources ?? {});
			const all = (resources as Record<string, string>[]).map((r) => ({
				title: r.title ?? r.name ?? '',
				url: r.url ?? r.download_url ?? '',
				format: (r.format ?? '').toLowerCase()
			}));
			console.log(`trees: ${api} lists ${JSON.stringify(all).slice(0, 1500)}`);
			const csvs = all.filter((r) => r.format.includes('csv') || /\.csv(\?|$)/i.test(r.url));
			// The newest list first, by the latest year its title names.
			const year = (t: string) => Math.max(0, ...(t.match(/\d{4}/g) ?? []).map(Number));
			if (csvs.length) return csvs.sort((a, b) => year(b.title) - year(a.title));
		} catch (err) {
			console.log(`trees: ${api} did not answer: ${(err as Error).message.slice(0, 200)}`);
		}
	}
	return [];
}

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
			console.log(
				`${key}: ${taken.records.length} records${taken.areas ? `, ${taken.areas.length} areas` : ''} written to ${path}`
			);
		}
	} catch (err) {
		// One source failing leaves the others' records to be kept.
		console.error(`${key} failed: ${(err as Error).message}`);
		failed++;
	}
}
if (failed === wanted.length) process.exit(1);
