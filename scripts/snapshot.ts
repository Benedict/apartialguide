/**
 * Takes a dated snapshot from the OSM API, for development and tests. Run by hand or from the
 * Snapshot workflow, never from the app. Give the area one of two ways:
 *   BBOX=minLon,minLat,maxLon,maxLat npm run snapshot
 *   AROUND_WAY=26605222 RADIUS_M=400 npm run snapshot
 * Writes data/snapshots/<SNAPSHOT_NAME>-<date>.json. The API refuses areas with more than 50,000 nodes.
 *
 * With AS_OF=2013-01-01,2017-01-01 it instead fetches the map as it stood on each date, from
 * Overpass, into data/history/<SNAPSHOT_NAME>-<date>.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bboxAround, type LatLon } from '../src/lib/core/geo';

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

let bbox = process.env.BBOX;
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

const name = process.env.SNAPSHOT_NAME ?? 'addiscombe';

if (process.env.AS_OF) {
	const [w, south, e, north] = bbox.split(',');
	const overpass = process.env.OVERPASS_API ?? 'https://overpass-api.de/api/interpreter';
	const dir = process.env.HISTORY_DIR ?? 'data/history';
	mkdirSync(dir, { recursive: true });
	// Nodes and ways only: relations would pull in every member of a bus route, miles away.
	for (const asOf of process.env.AS_OF.split(',').map((d) => d.trim())) {
		const query = `[out:json][timeout:180][date:"${asOf}T00:00:00Z"];(node(${south},${w},${north},${e});way(${south},${w},${north},${e}););(._;>;);out meta;`;
		const res = await fetch(overpass, {
			method: 'POST',
			headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ data: query })
		});
		if (!res.ok) {
			console.error(`Overpass answered ${res.status} for ${asOf}: ${await res.text()}`);
			process.exit(1);
		}
		const { elements, remark } = await res.json();
		// Overpass reports a timeout or memory limit as a remark beside a partial result.
		if (remark) {
			console.error(`Overpass gave a partial answer for ${asOf}: ${remark}`);
			process.exit(1);
		}
		const path = `${dir}/${name}-${asOf}.json`;
		writeFileSync(path, JSON.stringify({ bbox, asOf, taken: new Date().toISOString(), elements }));
		console.log(`${elements.length} elements as of ${asOf} written to ${path}`);
	}
	process.exit(0);
}

const date = process.env.SNAPSHOT_DATE ?? new Date().toISOString().slice(0, 10);
const data = await get(`/map.json?bbox=${bbox}`);
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
writeFileSync(path, JSON.stringify({ bbox, taken: new Date().toISOString(), ...data }));
console.log(`${data.elements.length} elements written to ${path}`);
