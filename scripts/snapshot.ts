/**
 * Takes a dated snapshot from the OSM API, for development and tests. Run by hand or from the
 * Snapshot workflow, never from the app. Give the area one of two ways:
 *   BBOX=minLon,minLat,maxLon,maxLat npm run snapshot
 *   AROUND_WAY=26605222 RADIUS_M=400 npm run snapshot
 * Writes data/snapshots/<SNAPSHOT_NAME>-<date>.json. The API refuses areas with more than 50,000 nodes.
 *
 * With AS_OF=2013-01-01,2017-01-01 it instead fetches the map as it stood on each date, from
 * Overpass, into data/history/<SNAPSHOT_NAME>-<date>.json.
 *
 * AROUND_PLACE=Addiscombe RADIUS_M=1200 takes the box around the map's own point for the place.
 * AREA="^Addiscombe (East|West)$" takes the box around the administrative boundaries whose names
 * match, from Overpass, and fetches the map in it from Overpass too: a whole area is more than the
 * OSM API will give at once. Without BBOX, AS_OF uses the box of the newest snapshot.
 *
 * FROM_OPL=croydon.opl BBOX=… SNAPSHOT_DATE=… reads a downloaded extract instead, cut to the box and
 * written as OPL by osmium: the way to take a whole borough without asking a shared server for it.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { bboxAround, type LatLon } from '../src/lib/core/geo';
import { readJson, writeJson } from '../src/lib/server/json';
import { oplElement } from '../src/lib/server/opl';
import {
	bboxAroundBoundaries,
	mergeElements,
	placeCentre,
	politely,
	tiles
} from '../src/lib/server/area';

const api = process.env.OSM_API ?? 'https://api.openstreetmap.org/api/0.6';
const headers = { 'User-Agent': 'a-partial-guide/0.1 (art project; snapshot script)' };

async function get(path: string) {
	const res = await fetch(`${api}${path}`, { headers });
	if (!res.ok) {
		console.error(`OSM API answered ${res.status} for ${path}: ${await res.text()}`);
		process.exit(1);
	}
	return res.json();
}

/** The middle of a way's nodes. */
async function wayCentre(id: string): Promise<LatLon> {
	const { elements } = await get(`/way/${id}/full.json`);
	const nodes = elements.filter((e: { type: string }) => e.type === 'node');
	const lat = nodes.reduce((s: number, n: { lat: number }) => s + n.lat, 0) / nodes.length;
	const lon = nodes.reduce((s: number, n: { lon: number }) => s + n.lon, 0) / nodes.length;
	return [lat, lon];
}

const overpass = process.env.OVERPASS_API ?? 'https://overpass-api.de/api/interpreter';
const name = process.env.SNAPSHOT_NAME ?? 'addiscombe';

/** An Overpass query's answer, refusing a partial one (Overpass reports a timeout as a remark). */
async function ask(query: string, what: string) {
	// A busy server is asked again after 1, 2, 4, 8 and 16 minutes.
	const res = await politely(
		() =>
			fetch(overpass, {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ data: query })
			}),
		[60, 120, 240, 480, 960],
		async (seconds) => {
			console.log(`Overpass is busy; asking again in ${seconds} s`);
			await new Promise((r) => setTimeout(r, seconds * 1000));
		}
	);
	if (!res.ok) {
		console.error(`Overpass answered ${res.status} for ${what}: ${await res.text()}`);
		process.exit(1);
	}
	const answer = await res.json();
	if (answer.remark) {
		console.error(`Overpass gave a partial answer for ${what}: ${answer.remark}`);
		process.exit(1);
	}
	return answer;
}

let bbox = process.env.BBOX;
let area: string[] | undefined;
/** Whether to take the box from the OSM API a tile at a time: a whole district is over its limit. */
let tiled = false;
if (!bbox && process.env.AREA) {
	const pattern = process.env.AREA.replace(/"/g, '\\"');
	// Any kind of boundary: wards are tagged administrative in some places and political in others.
	const answer = await ask(
		`[out:json][timeout:60];rel["boundary"]["name"~"${pattern}"];out tags bb;`,
		`the boundaries named ${process.env.AREA}`
	);
	if (!answer.elements.length) {
		const near = await ask(
			`[out:json][timeout:60];rel["boundary"]["name"~"Addiscombe"];out tags;`,
			'boundaries named Addiscombe'
		);
		const names = near.elements.map(
			(e: { tags: Record<string, string> }) => `${e.tags.name} (${e.tags.boundary})`
		);
		console.error(
			`No boundary matches ${process.env.AREA}. Boundaries named Addiscombe: ${names.join('; ') || 'none'}`
		);
		process.exit(1);
	}
	({ bbox, names: area } = bboxAroundBoundaries(answer));
	console.log(`${area.join(', ')} → bbox ${bbox}`);
}
if (!bbox && process.env.AROUND_PLACE) {
	// The map's own point for a place, read from the newest snapshot (OSM has no outline for every
	// district), and a radius around it.
	const radius = Number(process.env.RADIUS_M ?? 1200);
	const snapshots = process.env.SNAPSHOT_DIR ?? 'data/snapshots';
	const newest = readdirSync(snapshots)
		.filter((f) => f.startsWith(name) && /\.json(\.gz)?$/.test(f))
		.sort()
		.at(-1);
	if (!newest) {
		console.error(`AROUND_PLACE reads the place from a snapshot, and ${snapshots} has none`);
		process.exit(1);
	}
	const { elements } = readJson<{ elements: never[]; bbox: string }>(`${snapshots}/${newest}`);
	const centre = placeCentre({
		elements: elements.filter(
			(e: { tags?: Record<string, string> }) => e.tags?.name === process.env.AROUND_PLACE
		)
	});
	bbox = bboxAround(centre, radius)
		.map((v) => v.toFixed(6))
		.join(',');
	tiled = true;
	area = [`${process.env.AROUND_PLACE}, ${radius} m around ${centre.join(',')} (from ${newest})`];
	console.log(
		`${process.env.AROUND_PLACE} at ${centre.join(',')} in ${newest}, ${radius} m around → bbox ${bbox}`
	);
}
if (!bbox && process.env.AS_OF) {
	const snapshots = process.env.SNAPSHOT_DIR ?? 'data/snapshots';
	const newest = readdirSync(snapshots)
		.filter((f) => f.startsWith(name) && /\.json(\.gz)?$/.test(f))
		.sort()
		.at(-1);
	bbox = newest && readJson<{ elements: never[]; bbox: string }>(`${snapshots}/${newest}`).bbox;
	if (bbox) console.log(`bbox ${bbox}, from ${newest}`);
}
if (!bbox && process.env.AROUND_WAY) {
	const radius = Number(process.env.RADIUS_M ?? 400);
	const centre = await wayCentre(process.env.AROUND_WAY);
	bbox = bboxAround(centre, radius)
		.map((v) => v.toFixed(6))
		.join(',');
	console.log(
		`way/${process.env.AROUND_WAY} centre ${centre.join(',')}, ${radius} m → bbox ${bbox}`
	);
}
if (!bbox || bbox.split(',').length !== 4) {
	console.error('Set BBOX=minLon,minLat,maxLon,maxLat, or AROUND_WAY=<way id> with RADIUS_M');
	process.exit(1);
}

if (process.env.AS_OF) {
	const [w, south, e, north] = bbox.split(',');
	const dir = process.env.HISTORY_DIR ?? 'data/history';
	mkdirSync(dir, { recursive: true });
	// Nodes and ways only: relations would pull in every member of a bus route, miles away.
	for (const asOf of process.env.AS_OF.split(',').map((d) => d.trim())) {
		const query = `[out:json][timeout:180][date:"${asOf}T00:00:00Z"];(node(${south},${w},${north},${e});way(${south},${w},${north},${e}););(._;>;);out meta;`;
		const { elements } = await ask(query, `the map as of ${asOf}`);
		const path = `${dir}/${name}-${asOf}.json`;
		writeFileSync(path, JSON.stringify({ bbox, asOf, taken: new Date().toISOString(), elements }));
		console.log(`${elements.length} elements as of ${asOf} written to ${path}`);
	}
	process.exit(0);
}

const date = process.env.SNAPSHOT_DATE ?? new Date().toISOString().slice(0, 10);

/** The box from the OSM API in tiles of about 800 m, each well under its 50,000-node limit. */
async function inTiles(box: string) {
	const parts = tiles(box, 800);
	const lists = [];
	for (const [i, tile] of parts.entries()) {
		const { elements } = await get(`/map.json?bbox=${tile}`);
		console.log(`tile ${i + 1} of ${parts.length}: ${elements.length} elements`);
		lists.push(elements);
	}
	return mergeElements(lists);
}
const [w, south, e, north] = bbox.split(',');
// Nodes and ways only, as for past maps: relations would pull in far-off members.
/** A downloaded extract, cut to the box and written as OPL by osmium (FROM_OPL), read a line at a time. */
async function fromOpl(path: string) {
	const elements = [];
	for await (const line of createInterface({ input: createReadStream(path) })) {
		const element = oplElement(line);
		if (element) elements.push(element);
	}
	return elements;
}
const data = process.env.FROM_OPL
	? { elements: await fromOpl(process.env.FROM_OPL) }
	: tiled
		? { elements: await inTiles(bbox) }
		: area
			? await ask(
					`[out:json][timeout:900][maxsize:2147483648];(node(${south},${w},${north},${e});way(${south},${w},${north},${e}););(._;>;);out meta;`,
					'the map'
				)
			: await get(`/map.json?bbox=${bbox}`);
const dir = process.env.SNAPSHOT_DIR ?? 'data/snapshots';
mkdirSync(dir, { recursive: true });
// A whole borough is kept gzipped (SNAPSHOT_GZIP=1): raw, it is more than a repository takes in one file.
const path = `${dir}/${name}-${date}.json${process.env.SNAPSHOT_GZIP ? '.gz' : ''}`;
// The same map again keeps the first capture, so its time of taking stays true.
if (existsSync(path)) {
	const previous = readJson<{ bbox: string; taken: string; elements: unknown[] }>(path);
	if (
		previous.bbox === bbox &&
		JSON.stringify(previous.elements) === JSON.stringify(data.elements)
	) {
		console.log(`${path} already holds this map, taken ${previous.taken}; left as it is`);
		process.exit(0);
	}
}
writeJson(path, {
	bbox,
	...(area ? { area } : {}),
	taken: new Date().toISOString(),
	elements: data.elements
});
console.log(`${data.elements.length} elements written to ${path}`);
