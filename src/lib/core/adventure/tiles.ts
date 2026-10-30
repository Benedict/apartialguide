import type { StopId } from '../stops';
import { packWorld, unpackWorld, type PackedWorld } from './packed';
import type { AdventureWorld, CompiledStop } from './world';

/** Everything the walk needs before any place is opened: the world without its stops. */
export type WorldHead = Omit<AdventureWorld, 'stops'>;

/** A piece of the map, as the site serves it: its stops packed, each thing once. */
export type Tile = Pick<PackedWorld, 'things' | 'stops'>;

const METRES_PER_DEGREE = 111_320;
/** Between a tile's name and a stop's number within it: a link says where to find what it names. */
const SEP = ':';

/** The world without its stops. */
export const headOf = (world: AdventureWorld): WorldHead =>
	Object.fromEntries(Object.entries(world).filter(([k]) => k !== 'stops')) as WorldHead;

/** The tile a stop lies in, from its name. */
export const tileOf = (id: StopId): string | undefined =>
	id.includes(SEP) ? id.slice(0, id.indexOf(SEP)) : undefined;

/**
 * Cuts the world into square tiles about `metres` across, so the walk opens only the pieces it
 * reaches. Each stop is renamed by its tile, and every exit with it.
 */
export function tileWorld(
	world: AdventureWorld,
	metres = 300
): { head: WorldHead; tiles: Record<string, Tile> } {
	const placed = Object.entries(world.stops);
	const lats = placed.flatMap(([, s]) => (s.at ? [s.at[0]] : []));
	const lons = placed.flatMap(([, s]) => (s.at ? [s.at[1]] : []));
	const [lat0, lon0] = [Math.min(...lats), Math.min(...lons)];
	const dLat = metres / METRES_PER_DEGREE;
	const dLon = metres / (METRES_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180));
	const cell = (stop: CompiledStop) =>
		stop.at
			? `${Math.floor((stop.at[0] - lat0) / dLat)}-${Math.floor((stop.at[1] - lon0) / dLon)}`
			: 'x';

	const names = new Map<StopId, StopId>();
	const counts = new Map<string, number>();
	for (const [id, stop] of placed) {
		const key = cell(stop);
		const n = counts.get(key) ?? 0;
		counts.set(key, n + 1);
		names.set(id, `${key}${SEP}${n}`);
	}
	const byTile = new Map<string, Record<StopId, CompiledStop>>();
	for (const [id, stop] of placed) {
		const name = names.get(id)!;
		const stops = byTile.get(tileOf(name)!) ?? {};
		stops[name] = {
			...stop,
			exits: stop.exits.map((e) => ({ ...e, to: names.get(e.to) ?? e.to }))
		};
		byTile.set(tileOf(name)!, stops);
	}
	const head: WorldHead = { ...headOf(world), start: names.get(world.start) ?? world.start };
	const tiles: Record<string, Tile> = {};
	for (const [key, stops] of byTile) {
		const { things, stops: packed } = packWorld({ start: '', stops });
		tiles[key] = { things, stops: packed };
	}
	return { head, tiles };
}

/**
 * A world that opens its tiles as the walk reaches them. The engine reads `world.stops` as ever;
 * `ensure` is awaited first for the places a command needs.
 */
export function tiledWorld(
	head: WorldHead,
	fetchTile: (key: string) => Promise<Tile>
): { world: AdventureWorld; ensure: (ids: readonly StopId[]) => Promise<void> } {
	const world: AdventureWorld = { ...head, stops: {} };
	const opening = new Map<string, Promise<void>>();
	const open = (key: string) => {
		if (!opening.has(key))
			opening.set(
				key,
				fetchTile(key).then(
					(tile) => {
						Object.assign(world.stops, unpackWorld({ start: '', ...tile }).stops);
					},
					(error) => {
						// Asked again next time, if the network comes back.
						opening.delete(key);
						throw error;
					}
				)
			);
		return opening.get(key)!;
	};
	const ensure = async (ids: readonly StopId[]) => {
		const keys = new Set(ids.map(tileOf).filter((k): k is string => !!k));
		await Promise.all([...keys].map(open));
	};
	return { world, ensure };
}
