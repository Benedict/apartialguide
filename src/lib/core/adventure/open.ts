import type { StopId } from '../stops';
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
	const { areas: _areas, ...rest } = about;
	return {
		...rest,
		streets: streets.size,
		places: Object.keys(stops).length,
		...(kind ? { areas: { kind, count: inArea.size, most } } : {})
	};
}
