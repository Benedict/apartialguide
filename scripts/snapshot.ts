/**
 * Takes a dated snapshot of a bounding box from the OSM API, for development and tests.
 * Run by hand, never from the app: BBOX=minLon,minLat,maxLon,maxLat npm run snapshot
 * Writes data/snapshots/<SNAPSHOT_NAME>-<date>.json. The API refuses areas with more than 50,000 nodes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const bbox = process.env.BBOX;
if (!bbox || bbox.split(',').length !== 4) {
	console.error('Set BBOX=minLon,minLat,maxLon,maxLat');
	process.exit(1);
}
const name = process.env.SNAPSHOT_NAME ?? 'addiscombe';
const date = process.env.SNAPSHOT_DATE ?? new Date().toISOString().slice(0, 10);
const api = process.env.OSM_API ?? 'https://api.openstreetmap.org/api/0.6';

const res = await fetch(`${api}/map.json?bbox=${bbox}`, {
	headers: { 'User-Agent': 'addiscombe-narrator/0.1 (art project; snapshot script)' }
});
if (!res.ok) {
	console.error(`OSM API answered ${res.status}: ${await res.text()}`);
	process.exit(1);
}
const data = await res.json();
const dir = process.env.SNAPSHOT_DIR ?? 'data/snapshots';
mkdirSync(dir, { recursive: true });
const path = `${dir}/${name}-${date}.json`;
writeFileSync(path, JSON.stringify({ bbox, taken: new Date().toISOString(), ...data }));
console.log(`${data.elements.length} elements written to ${path}`);
