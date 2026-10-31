import type { StopId } from '../stops';
import type { AreaList } from '../release';
import { goalsFor, routeIndex } from './route';
import type { AdventureWorld, CompiledStop } from './world';

/**
 * The world as far as it is open to walk: only the areas enriched so far. The stops elsewhere are
 * left out, and each way into them is kept, marked with the name of the area it leads into, so the
 * walk stops at the edge and the page can say what is to come. What Guide carries is counted again
 * from what is open, every figure the data's.
 */
export function closeAreas(
	world: AdventureWorld,
	/** The area a stop lies in, where it is not open; nothing where it is. By the stop's name. */
	closedArea: (id: StopId) => string | undefined
): AdventureWorld {
	if (closedArea(world.start) !== undefined)
		throw new Error(`The start, ${world.start}, lies in a closed area`);
	const stops: Record<StopId, CompiledStop> = {};
	for (const [id, stop] of Object.entries(world.stops))
		if (closedArea(id) === undefined)
			stops[id] = {
				...stop,
				exits: stop.exits.map((e) => {
					const area = closedArea(e.to);
					return area === undefined ? e : { ...e, closed: area };
				})
			};
	return { ...world, stops, ...(world.about ? { about: recount(world.about, stops) } : {}) };
}

/** The ledger's figures again, from the open stops: places, the streets they lie on, the areas. */
function recount(
	about: NonNullable<AdventureWorld['about']>,
	stops: Record<string, CompiledStop>
): NonNullable<AdventureWorld['about']> {
	const streets = new Set<string>();
	const inArea = new Map<string, number>();
	let kind: string | undefined;
	for (const stop of Object.values(stops)) {
		for (const e of stop.exits) if (e.street && !e.closed) streets.add(e.street);
		if (stop.area) {
			kind = stop.area.kind;
			inArea.set(stop.area.name, (inArea.get(stop.area.name) ?? 0) + 1);
		}
	}
	const most = [...inArea]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 2)
		.map(([name]) => name);
	const rest = { ...about };
	delete rest.areas;
	return {
		...rest,
		streets: streets.size,
		places: Object.keys(stops).length,
		...(kind ? { areas: { kind, count: inArea.size, most } } : {})
	};
}

/**
 * Where each area may be begun: an open area at the place its `start` names within it, or, with no
 * start, at the tour's start if that lies within it; an area not open yet without a place, so it
 * can be named at the edge. An area's stops are told by `areaOf`, from the ward each lies in.
 */
export function doorsFor(
	world: AdventureWorld,
	areas: AreaList,
	areaOf: (ward: string | undefined) => string | undefined
): NonNullable<AdventureWorld['doors']> {
	const index = routeIndex(world);
	const within = (name: string) => (id: StopId) => areaOf(world.stops[id]?.area?.name) === name;
	return areas.flatMap((area) => {
		if (!area.open) return [{ name: area.name }];
		const inside = within(area.name);
		if (area.start) {
			const stop = [...goalsFor(index, area.start).keys()].find(inside);
			if (!stop) throw new Error(`${area.name}: no place called ${area.start} within it`);
			return [{ name: area.name, stop }];
		}
		return inside(world.start) ? [{ name: area.name, stop: world.start }] : [];
	});
}

/** The places worth beginning at by chance: those told in prose written ahead of time, or with a name as found. */
export const anywhereIn = (world: AdventureWorld): StopId[] =>
	Object.entries(world.stops)
		.filter(([, stop]) => stop.plain || stop.fragments?.length)
		.map(([id]) => id);
