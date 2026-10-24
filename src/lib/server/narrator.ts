import { readFileSync } from 'node:fs';
import { fixedClock } from '../core/facts';
import { Narrator } from '../core/narrator';
import { compileWorld, type AdventureWorld } from '../core/adventure/world';
import type { LatLon } from '../core/geo';

/** Configuration comes from the environment only. */
export interface Config {
	snapshotPath: string;
	snapshotDate: string;
	spacing: number;
	start?: LatLon;
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
		start: start?.length === 2 && start.every(Number.isFinite) ? [start[0], start[1]] : undefined
	};
}

let cached: { world: AdventureWorld; config: Config } | undefined;

/** Every stop of the configured snapshot, narrated once per process. */
export function adventureWorld(): { world: AdventureWorld; config: Config } | undefined {
	if (cached) return cached;
	const config = readConfig();
	if (!config) return undefined;
	const data = JSON.parse(readFileSync(config.snapshotPath, 'utf8'));
	const narrator = Narrator.fromOsm(data, {
		clock: fixedClock(config.snapshotDate),
		spacing: config.spacing
	});
	const start = config.start
		? narrator.nearestStop(config.start)
		: narrator.graph.all().find((s) => s.kind === 'junction');
	if (!start) throw new Error('The snapshot has no streets in it.');
	cached = { config, world: compileWorld(narrator, start.id) };
	return cached;
}
