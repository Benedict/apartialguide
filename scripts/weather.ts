/**
 * Takes the weather on the days the map records, from Open-Meteo, for the weather adapter. Run by
 * hand or from the Weather workflow, never from the app:
 *   BBOX=minLon,minLat,maxLon,maxLat npm run weather
 * The days are the snapshot's, the past maps' (HISTORY_DIR) and every full survey date in the
 * snapshot, plus any in DATES. Writes data/weather/<SNAPSHOT_NAME>-<today>.json.
 * Open-Meteo's data is CC BY 4.0: credit it wherever the weather is shown.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { WeatherDay, WeatherStore } from '../src/lib/core/adapters/weather';
import {
	DAILY,
	daysFromOpenMeteo,
	recordedDates,
	type OpenMeteoDaily
} from '../src/lib/server/weather';

const headers = { 'User-Agent': 'a-partial-guide/0.1 (art project; weather script)' };

async function get(url: string): Promise<OpenMeteoDaily> {
	const res = await fetch(url, { headers });
	if (!res.ok) {
		console.error(`Open-Meteo answered ${res.status} for ${url}: ${await res.text()}`);
		process.exit(1);
	}
	return res.json();
}

const name = process.env.SNAPSHOT_NAME ?? 'addiscombe';
const latest = (dir: string) =>
	readdirSync(dir)
		.filter((f) => f.startsWith(name) && f.endsWith('.json'))
		.sort()
		.at(-1);
const snapshotPath = process.env.SNAPSHOT_PATH ?? `data/snapshots/${latest('data/snapshots')}`;
const snapshotDate = snapshotPath.match(/\d{4}-\d{2}-\d{2}/)?.[0];
const bbox = process.env.BBOX?.split(',').map(Number);
if (!snapshotDate || !bbox || bbox.length !== 4 || bbox.some((v) => !Number.isFinite(v))) {
	console.error('Set BBOX=minLon,minLat,maxLon,maxLat, and name the snapshot with its date');
	process.exit(1);
}
const latitude = +((bbox[1] + bbox[3]) / 2).toFixed(4);
const longitude = +((bbox[0] + bbox[2]) / 2).toFixed(4);

const historyDir = process.env.HISTORY_DIR ?? 'data/history';
const historyDates = existsSync(historyDir)
	? readdirSync(historyDir)
			.map((f) => f.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1])
			.filter((d): d is string => !!d)
	: [];
const dates = [
	...new Set([
		...recordedDates({
			snapshotDate,
			historyDates,
			snapshot: JSON.parse(readFileSync(snapshotPath, 'utf8'))
		}),
		...(process.env.DATES?.split(',').map((d) => d.trim()) ?? [])
	])
].sort();
console.log(`${dates.length} days to look up, ${dates[0]} to ${dates.at(-1)}`);

const query = (start: string, end: string) =>
	`latitude=${latitude}&longitude=${longitude}&start_date=${start}&end_date=${end}` +
	`&daily=${DAILY.join(',')}&timezone=Europe%2FLondon`;

// The archive is a reanalysis, a few days behind; recent days come from the forecast models instead.
const days: WeatherDay[] = daysFromOpenMeteo(
	await get(`https://archive-api.open-meteo.com/v1/archive?${query(dates[0], dates.at(-1)!)}`),
	dates
);
const missing = dates.filter((d) => !days.some((day) => day.date === d));
const recent = missing.filter((d) => Date.now() - Date.parse(d) < 90 * 86_400_000);
if (recent.length) {
	const answer = await get(
		`https://api.open-meteo.com/v1/forecast?${query(recent[0], recent.at(-1)!)}`
	);
	days.push(...daysFromOpenMeteo(answer, recent));
}
days.sort((a, b) => a.date.localeCompare(b.date));
const unknown = dates.filter((d) => !days.some((day) => day.date === d));
if (unknown.length) console.log(`No weather for ${unknown.join(', ')}`);

const retrieved = new Date().toISOString().slice(0, 10);
const store: WeatherStore & { retrieved: string } = {
	source: 'Open-Meteo.com',
	latitude,
	longitude,
	retrieved,
	days
};
mkdirSync('data/weather', { recursive: true });
const path = `data/weather/${name}-${retrieved}.json`;
writeFileSync(path, JSON.stringify(store, null, '\t') + '\n');
console.log(`${days.length} days written to ${path}`);
