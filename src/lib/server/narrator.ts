import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixedClock } from '../core/facts';
import type { WikidataStore } from '../core/adapters/wikidata';
import type { RecordStore } from '../core/adapters/records';
import { Narrator } from '../core/narrator';
import type { OsmData } from '../core/osm';
import { compileWorld, type AdventureWorld } from '../core/adventure/world';
import type { LatLon } from '../core/geo';
import { CachedRenderer, type NarrationStore } from '../core/render/cached';
import type { Stop } from '../core/stops';

/** Configuration comes from the environment only. */
export interface Config {
	snapshotPath: string;
	snapshotDate: string;
	spacing: number;
	start?: LatLon;
	/** Where prose written ahead of time is kept. Without it, stops use the template. */
	narrationPath?: string;
	/** Where earlier maps of the same place are kept, for what has gone or been renamed. */
	historyDir?: string;
	/** Where dated copies of Wikidata are kept. The newest is used. */
	wikidataDir?: string;
	/** Where other sources' records are kept, one file per source and date. The newest of each is used. */
	recordsDir?: string;
}

export function readConfig(
	source: Record<string, string | undefined> = process.env
): Config | undefined {
	const snapshotPath = source.SNAPSHOT_PATH;
	if (!snapshotPath) return undefined;
	const date = source.SNAPSHOT_DATE ?? snapshotPath.match(/\d{4}-\d{2}-\d{2}/)?.[0];
	if (!date) throw new Error('Set SNAPSHOT_DATE, or name the snapshot file with its date');
	const start = source.START_AT?.split(',').map(Number);
	return {
		snapshotPath,
		snapshotDate: date,
		spacing: Number(source.STOP_SPACING_M ?? 50),
		start: start?.length === 2 && start.every(Number.isFinite) ? [start[0], start[1]] : undefined,
		narrationPath: source.NARRATION_PATH,
		historyDir: source.HISTORY_DIR,
		wikidataDir: source.WIKIDATA_DIR,
		recordsDir: source.RECORDS_DIR
	};
}

let cached: { world: AdventureWorld; config: Config } | undefined;

/** Every stop of the configured snapshot, narrated once per process. */
export function adventureWorld(): { world: AdventureWorld; config: Config } | undefined {
	if (cached) return cached;
	const config = readConfig();
	if (!config) return undefined;
	const narrator = loadNarrator(config);
	cached = {
		config,
		world: compileWorld(narrator, startStop(narrator, config).id, {
			asOf: config.snapshotDate
		})
	};
	return cached;
}

/** Prose written ahead of time, or none when there is no file yet. */
export function loadNarration(path?: string): NarrationStore {
	return path && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

/** Every past map in a directory, oldest first. */
export function loadHistory(dir?: string): { asOf: string; data: OsmData }[] {
	if (!dir || !existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as OsmData & { asOf: string })
		.map((data) => ({ asOf: data.asOf, data }))
		.sort((a, b) => a.asOf.localeCompare(b.asOf));
}

/** The newest dated JSON file in a directory, or nothing. */
export function loadLatest<T>(dir?: string): T | undefined {
	if (!dir || !existsSync(dir)) return undefined;
	const newest = readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.sort()
		.at(-1);
	return newest ? (JSON.parse(readFileSync(join(dir, newest), 'utf8')) as T) : undefined;
}

/** The newest records of each source in a directory: files named <prefix>-<date>.json. */
export function loadRecords(dir?: string): RecordStore[] {
	if (!dir || !existsSync(dir)) return [];
	const newest = new Map<string, string>();
	for (const f of readdirSync(dir)
		.filter((f) => /-\d{4}-\d{2}-\d{2}\.json$/.test(f))
		.sort())
		newest.set(f.replace(/-\d{4}-\d{2}-\d{2}\.json$/, ''), f);
	return [...newest.values()].map(
		(f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as RecordStore
	);
}

/** The narrator for the configured snapshot, using any prose written ahead of time. */
export function loadNarrator(config: Config): Narrator {
	const data = JSON.parse(readFileSync(config.snapshotPath, 'utf8'));
	return Narrator.fromOsm(data, {
		clock: fixedClock(config.snapshotDate),
		spacing: config.spacing,
		renderer: new CachedRenderer(loadNarration(config.narrationPath)),
		history: loadHistory(config.historyDir),
		wikidata: loadLatest<WikidataStore>(config.wikidataDir),
		records: loadRecords(config.recordsDir)
	});
}

/** Where the reader starts: the stop nearest START_AT, or the first junction. */
export function startStop(narrator: Narrator, config: Config): Stop {
	const start = config.start
		? narrator.nearestStop(config.start)
		: narrator.graph.all().find((s) => s.kind === 'junction');
	if (!start) throw new Error('The snapshot has no streets in it.');
	return start;
}
