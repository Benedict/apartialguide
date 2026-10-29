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
import { wildlifeRecords } from '../src/lib/server/sources/wildlife';
import { postcodeRecords } from '../src/lib/server/sources/postcodes';
import { companyRecords } from '../src/lib/server/sources/companies';
import { epcRecords } from '../src/lib/server/sources/epc';
import { britanniaBeyond } from '../src/lib/server/sources/britannia';
import { geographRecords } from '../src/lib/server/sources/geograph';
import {
	floodZoneName,
	recordedFloodName,
	zoneAreas,
	type ZoneFeature
} from '../src/lib/server/sources/zones';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebStream } from 'node:stream/web';

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
/**
 * Every feature in the box from an OGC API Features service, whichever of the given services
 * answers: its collections are listed, the first taken, its pages followed.
 */
async function ogcFeatures(label: string, bases: string[]): Promise<ZoneFeature[]> {
	for (const base of bases) {
		try {
			const list = await getJson(`${base}/collections?f=json`);
			const ids: string[] = (list.collections ?? []).map((c: { id: string }) => c.id);
			console.log(`${label}: ${base} has ${ids.join(', ')}`);
			if (!ids.length) continue;
			const features: ZoneFeature[] = [];
			const crs84 = encodeURIComponent('http://www.opengis.net/def/crs/OGC/1.3/CRS84');
			const items = `${base}/collections/${ids[0]}/items?f=json&limit=500&bbox-crs=${crs84}&crs=${crs84}`;
			// A control by the Thames at Westminster, where there must be something: an empty box is
			// told from a query the service misread.
			const control = await getJson(`${items}&bbox=-0.13,51.49,-0.11,51.51`);
			console.log(
				`${label}: control by the Thames matched ${control.numberMatched ?? control.features?.length}`
			);
			let url: string | undefined = `${items}&bbox=${w},${s},${e},${n}`;
			for (let pages = 0; url && pages < 40; pages++) {
				const page = await getJson(url);
				if (pages === 0)
					console.log(
						`${label}: ${page.numberMatched ?? '?'} matched, ${page.features?.length ?? 0} on the first page; ${String(JSON.stringify(page.features?.[0]?.properties ?? page)).slice(0, 400)}`
					);
				features.push(...(page.features ?? []));
				url = (page.links ?? []).find((l: { rel: string; href: string }) => l.rel === 'next')?.href;
			}
			return features;
		} catch (err) {
			console.log(`${label}: ${base} did not answer: ${(err as Error).message.slice(0, 200)}`);
		}
	}
	throw new Error(`no ${label} service answered`);
}

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
	/** Sightings of living things in the box, from the NBN Atlas: up to 20,000, a page at a time. */
	wildlife: async () => {
		const polygon = `POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))`;
		const occurrences: unknown[] = [];
		for (let start = 0; start < 20_000; start += 1000) {
			const page = await getJson(
				`https://records-ws.nbnatlas.org/occurrences/search?q=*:*&wkt=${encodeURIComponent(polygon)}&pageSize=1000&startIndex=${start}`
			);
			if (start === 0)
				console.log(
					`wildlife: ${page.totalRecords} records; first ${JSON.stringify(page.occurrences?.[0]).slice(0, 500)}`
				);
			occurrences.push(...(page.occurrences ?? []));
			if (!page.occurrences?.length || occurrences.length >= page.totalRecords) break;
		}
		const records = wildlifeRecords({ occurrences: occurrences as never }, bbox);
		return { source: 'NBN Atlas', prefix: 'wildlife', records };
	},
	/**
	 * Postcodes in the box that have ended, from the ONS Postcode Directory on the ONS Open
	 * Geography Portal: the service is found by searching the portal, as its name changes each issue.
	 */
	postcodes: async () => {
		const search = await getJson(
			`https://www.arcgis.com/sharing/rest/search?q=${encodeURIComponent('title:"ONS Postcode Directory" AND type:"Feature Service"')}&sortField=modified&sortOrder=desc&num=20&f=json`
		);
		const services = (search.results ?? []).map((r: { title: string; url: string }) => r);
		console.log(
			`postcodes: services ${JSON.stringify(services.map((r: { title: string }) => r.title)).slice(0, 600)}`
		);
		// The live directory holds only postcodes still in use; the dated tables keep those that ended.
		for (const service of services.filter((r: { title: string }) => !/\(Live\)/.test(r.title))) {
			try {
				// Each issue names its columns in its own case: ask the table for them.
				const layer = await getJson(`${service.url}/0?f=json`);
				const names: string[] = (layer.fields ?? []).map((f: { name: string }) => f.name);
				const col = (re: RegExp) => names.find((f) => re.test(f));
				const [lat, lon, ended] = [col(/^lat$/i), col(/^long$/i), col(/^doterm$/i)];
				if (!lat || !lon || !ended) {
					console.log(
						`postcodes: ${service.title}: no lat, long or doterm in ${names.slice(0, 30).join(',')}`
					);
					continue;
				}
				const where = `${lat} >= ${s} AND ${lat} <= ${n} AND ${lon} >= ${w} AND ${lon} <= ${e} AND ${ended} IS NOT NULL`;
				const features: unknown[] = [];
				for (let offset = 0; offset < 50_000; offset += 2000) {
					const page = await getJson(
						`${service.url}/0/query?where=${encodeURIComponent(where)}&outFields=*&f=geojson&resultOffset=${offset}&resultRecordCount=2000`
					);
					if (page.error) throw new Error(JSON.stringify(page.error).slice(0, 300));
					if (offset === 0)
						console.log(
							`postcodes: ${service.title}: first ${String(JSON.stringify(page.features?.[0]?.properties)).slice(0, 300)}`
						);
					features.push(...(page.features ?? []));
					if ((page.features?.length ?? 0) < 2000) break;
				}
				const records = postcodeRecords({ features: features as never }, bbox);
				console.log(
					`postcodes: ${service.title}: ${features.length} ended in the box, ${records.length} kept`
				);
				return { source: 'Office for National Statistics', prefix: 'postcode', records };
			} catch (err) {
				console.log(
					`postcodes: ${service.title} did not answer: ${(err as Error).message.slice(0, 300)}`
				);
			}
		}
		throw new Error('no postcode directory answered');
	},
	/**
	 * Companies registered at the snapshot's addresses, from Companies House's free monthly file of
	 * every company on the register, read line by line and kept only for the snapshot's postcodes.
	 */
	companies: async () => {
		const page = await (
			await fetch('https://download.companieshouse.gov.uk/en_output.html', { headers })
		).text();
		const file = page.match(/BasicCompanyDataAsOneFile-\d{4}-\d{2}-\d{2}\.zip/)?.[0];
		if (!file) throw new Error('no company data file is listed');
		console.log(`companies: ${file}`);
		const zip = '/tmp/companies.zip';
		const res = await fetch(`https://download.companieshouse.gov.uk/${file}`, { headers });
		if (!res.ok || !res.body) throw new Error(`${file} answered ${res.status}`);
		await pipeline(Readable.fromWeb(res.body as WebStream), createWriteStream(zip));
		const wanted = new Set(postcodes);
		const outward = [...new Set(postcodes.map((p) => p.split(' ')[0]))];
		const unzip = spawn('unzip', ['-p', zip]);
		const rows: Record<string, string>[] = [];
		let header = '';
		for await (const line of createInterface({ input: unzip.stdout })) {
			if (!header) {
				header = line;
				continue;
			}
			if (!outward.some((o) => line.includes(`${o} `))) continue;
			rows.push(...parseCsv(`${header}\n${line}`));
		}
		const records = companyRecords(rows, wanted);
		console.log(`companies: ${rows.length} rows near, ${records.length} addresses`);
		return { source: 'Companies House', prefix: 'company', records };
	},
	/**
	 * Energy performance certificates at the snapshot's postcodes, asked of the register one postcode
	 * at a time. Needs EPC_EMAIL and EPC_API_KEY, given on registering with the register.
	 */
	epc: async () => {
		const email = process.env.EPC_EMAIL;
		const key = process.env.EPC_API_KEY;
		if (!email || !key) throw new Error('epc needs EPC_EMAIL and EPC_API_KEY');
		const auth = `Basic ${Buffer.from(`${email}:${key}`).toString('base64')}`;
		const rows: Record<string, string>[] = [];
		for (const postcode of postcodes) {
			const page = await getJson(
				`https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encodeURIComponent(postcode)}&size=5000`,
				{ Authorization: auth }
			).catch((err) => {
				console.log(`epc: ${postcode}: ${(err as Error).message.slice(0, 200)}`);
				return { rows: [] };
			});
			rows.push(...(page.rows ?? []));
		}
		const records = epcRecords(rows);
		console.log(
			`epc: ${postcodes.length} postcodes, ${rows.length} certificates, ${records.length} addresses`
		);
		return { source: 'Energy Performance of Buildings Register', prefix: 'epc', records };
	},
	/** Photographs of the box from Geograph, page by page around its centre. Needs GEOGRAPH_API_KEY. */
	geograph: async () => {
		const key = process.env.GEOGRAPH_API_KEY;
		if (!key) throw new Error('geograph needs GEOGRAPH_API_KEY');
		const km = Math.ceil(
			Math.hypot((n - s) * 111, (e - w) * 111 * Math.cos((centre.lat * Math.PI) / 180)) / 2
		);
		const items: unknown[] = [];
		for (let page = 1; page <= 50; page++) {
			const answer = await getJson(
				`https://api.geograph.org.uk/syndicator.php?key=${encodeURIComponent(key)}&format=JSON&q=${centre.lat.toFixed(5)},${centre.lon.toFixed(5)}&distance=${km}&perpage=100&page=${page}`
			);
			const got = answer.items ?? [];
			if (page === 1)
				console.log(`geograph: first item ${JSON.stringify(got[0] ?? {}).slice(0, 300)}`);
			items.push(...got);
			if (got.length < 100) break;
		}
		const records = geographRecords({ items: items as never }, bbox);
		console.log(`geograph: ${items.length} photographs, ${records.length} kept`);
		return { source: 'Geograph', prefix: 'geograph', records };
	},
	/**
	 * Digital Britannia's Roman roads and sites near the map, beyond its edge: read from its GeoJSON
	 * layers in BRITANNIA_DIR (roads, settlement, military, camps, milestones .geojson), downloaded by
	 * hand from the RRRA, whose site does not answer scripts. Longitude and latitude only.
	 */
	britannia: async () => {
		const dir = process.env.BRITANNIA_DIR;
		if (!dir) throw new Error('britannia needs BRITANNIA_DIR, a folder of its GeoJSON layers');
		const layer = (name: string) => {
			try {
				return JSON.parse(readFileSync(`${dir}/${name}.geojson`, 'utf8'));
			} catch {
				console.log(`britannia: no ${name}.geojson`);
				return undefined;
			}
		};
		const layers = Object.fromEntries(
			['roads', 'settlement', 'military', 'camps', 'milestones'].map((n) => [n, layer(n)])
		);
		const first = layers.roads?.features?.[0]?.geometry?.coordinates?.flat(3)?.[0];
		if (typeof first === 'number' && Math.abs(first) > 180)
			throw new Error(
				'britannia: the layers are in British National Grid; give them in longitude and latitude'
			);
		const beyond = britanniaBeyond(layers, bbox);
		console.log(`britannia: ${beyond.length} Roman things near the map`);
		return {
			source: 'Roman Roads Research Association, Digital Britannia v1',
			prefix: 'roman',
			records: [],
			beyond
		};
	},
	/** The Environment Agency's flood zones over the box, from the Flood Map for Planning. */
	floodzones: async () => {
		const features = await ogcFeatures('floodzones', [
			'https://environment.data.gov.uk/spatialdata/flood-map-for-planning-flood-zones/ogc/features/v1',
			'https://environment.data.gov.uk/spatialdata/flood-zones/ogc/features/v1'
		]);
		const areas = zoneAreas(features, 'flood zone', floodZoneName);
		return { source: 'Environment Agency', prefix: 'floodzone', records: [], overlay: true, areas };
	},
	/** Floods the Environment Agency has recorded over the box, each by the month it began. */
	floods: async () => {
		const features = await ogcFeatures('floods', [
			'https://environment.data.gov.uk/spatialdata/recorded-flood-outlines/ogc/features/v1'
		]);
		const areas = zoneAreas(features, 'recorded flood', recordedFloodName);
		return { source: 'Environment Agency', prefix: 'flood', records: [], overlay: true, areas };
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
