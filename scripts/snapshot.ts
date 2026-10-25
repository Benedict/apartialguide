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
 * AREA="^Addiscombe (East|West)$" takes the box around the administrative boundaries whose names
 * match, from Overpass, and fetches the map in it from Overpass too: a whole area is more than the
 * OSM API will give at once. Without BBOX, AS_OF uses the box of the newest snapshot.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bboxAround, type LatLon } from '../src/lib/core/geo';
import { bboxAroundBoundaries } from '../src/lib/server/area';

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
	const res = await fetch(overpass, {
		method: 'POST',
		headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ data: query })
	});
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
if (!bbox && process.env.AREA) {
	const pattern = process.env.AREA.replace(/"/g, '\\"');
	const found = bboxAroundBoundaries(
		await ask(
			`[out:json][timeout:60];rel["boundary"="administrative"]["name"~"${pattern}"];out tags bb;`,
			`the boundaries named ${process.env.AREA}`
		)
	);
	({ bbox, names: area } = found);
	console.log(`${area.join(', ')} → bbox ${bbox}`);
}
if (!bbox && process.env.AS_OF) {
	const snapshots = process.env.SNAPSHOT_DIR ?? 'data/snapshots';
	const newest = readdirSync(snapshots)
		.filter((f) => f.startsWith(name) && f.endsWith('.json'))
		.sort()
		.at(-1);
	bbox = newest && JSON.parse(readFileSync(`${snapshots}/${newest}`, 'utf8')).bbox;
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
const [w, south, e, north] = bbox.split(',');
// Nodes and ways only, as for past maps: relations would pull in far-off members.
const data = area
	? await ask(
			`[out:json][timeout:300];(node(${south},${w},${north},${e});way(${south},${w},${north},${e}););(._;>;);out meta;`,
			'the map'
		)
	: await get(`/map.json?bbox=${bbox}`);
const dir = process.env.SNAPSHOT_DIR ?? 'data/snapshots';
mkdirSync(dir, { recursive: true });
const path = `${dir}/${name}-${date}.json`;
// The same map again keeps the first capture, so its time of taking stays true.
if (existsSync(path)) {
	const previous = JSON.parse(readFileSync(path, 'utf8'));
	if (
		previous.bbox === bbox &&
		JSON.stringify(previous.elements) === JSON.stringify(data.elements)
	) {
		console.log(`${path} already holds this map, taken ${previous.taken}; left as it is`);
		process.exit(0);
	}
}
writeFileSync(
	path,
	JSON.stringify({
		bbox,
		...(area ? { area } : {}),
		taken: new Date().toISOString(),
		elements: data.elements
	})
);
console.log(`${data.elements.length} elements written to ${path}`);
