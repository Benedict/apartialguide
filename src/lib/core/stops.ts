import { bearing, compassLabel, pointAlong, polylineLength, type LatLon } from './geo';
import type { OsmIndex, OsmWay } from './osm';

export type StopId = string;

export interface Exit {
	label: string;
	bearing: number;
	to: StopId;
	street?: string;
	wayId: number;
}

export interface Stop {
	id: StopId;
	position: LatLon;
	/** A junction joins streets or ends one; a corridor stop sits part way along a street. */
	kind: 'junction' | 'corridor';
	exits: Exit[];
}

export interface StopGraphOptions {
	/** Largest gap between stops along a street, in metres. */
	spacing?: number;
}

/** Highways a person can walk along. Anything else is not a street to the reader. */
const UNWALKABLE = new Set([
	'motorway',
	'motorway_link',
	'trunk',
	'trunk_link',
	'construction',
	'proposed',
	'raceway',
	'bus_guideway',
	'platform',
	'elevator'
]);

export const isWalkable = (way: OsmWay) =>
	!!way.tags?.highway && !UNWALKABLE.has(way.tags.highway) && way.tags.area !== 'yes';

export const junctionId = (nodeId: number): StopId => `n${nodeId}`;

/** How far ahead to look when judging which way a street leaves a stop. */
const HEADING_LOOKAHEAD_M = 15;

export class StopGraph {
	constructor(private readonly stops: ReadonlyMap<StopId, Stop>) {}

	get(id: StopId): Stop | undefined {
		return this.stops.get(id);
	}

	all(): Stop[] {
		return [...this.stops.values()];
	}

	/**
	 * Leaves `from` by the exit labelled `label`, then keeps going along the street
	 * through corridor stops until the next junction. Returns every stop visited, `from` included.
	 */
	walk(from: StopId, label: string): StopId[] {
		const path = [from];
		let exit = this.get(from)?.exits.find((e) => e.label === label);
		while (exit) {
			const prev = path[path.length - 1];
			path.push(exit.to);
			const here = this.get(exit.to)!;
			if (here.kind === 'junction') break;
			exit = here.exits.find((e) => e.to !== prev);
		}
		return path;
	}
}

export function buildStopGraph(osm: OsmIndex, { spacing = 50 }: StopGraphOptions = {}): StopGraph {
	const ways = osm.ways.filter(isWalkable);
	const stops = new Map<StopId, Stop>();

	const uses = new Map<number, number>();
	for (const way of ways) {
		way.nodes.forEach((id, i) => {
			const isEnd = i === 0 || i === way.nodes.length - 1;
			uses.set(id, (uses.get(id) ?? 0) + (isEnd ? 2 : 1));
		});
	}
	const isJunction = (id: number) => (uses.get(id) ?? 0) >= 2;

	const junction = (nodeId: number): Stop => {
		const id = junctionId(nodeId);
		let stop = stops.get(id);
		if (!stop) {
			const n = osm.nodes.get(nodeId)!;
			stop = { id, position: [n.lat, n.lon], kind: 'junction', exits: [] };
			stops.set(id, stop);
		}
		return stop;
	};

	for (const way of ways) {
		const present = way.nodes.filter((id) => osm.nodes.has(id));
		let start = 0;
		let segment = 0;
		for (let i = 1; i < present.length; i++) {
			if (!isJunction(present[i]) && i !== present.length - 1) continue;
			const nodeIds = present.slice(start, i + 1);
			const line = nodeIds.map((id) => {
				const n = osm.nodes.get(id)!;
				return [n.lat, n.lon] as LatLon;
			});
			linkAlong(way, segment++, line, junction(nodeIds[0]), junction(nodeIds[nodeIds.length - 1]));
			start = i;
		}
	}

	function linkAlong(way: OsmWay, segment: number, line: LatLon[], from: Stop, to: Stop) {
		const length = polylineLength(line);
		if (length === 0) return;
		const parts = Math.max(1, Math.ceil(length / spacing));
		const chain: { stop: Stop; at: number }[] = [{ stop: from, at: 0 }];
		for (let k = 1; k < parts; k++) {
			const at = (length * k) / parts;
			const stop: Stop = {
				id: `w${way.id}.${segment}.${k}`,
				position: pointAlong(line, at),
				kind: 'corridor',
				exits: []
			};
			stops.set(stop.id, stop);
			chain.push({ stop, at });
		}
		chain.push({ stop: to, at: length });

		const street = way.tags?.name ?? way.tags?.ref;
		for (let i = 1; i < chain.length; i++) {
			const a = chain[i - 1];
			const b = chain[i];
			const ahead = Math.min(a.at + HEADING_LOOKAHEAD_M, b.at);
			const behind = Math.max(b.at - HEADING_LOOKAHEAD_M, a.at);
			a.stop.exits.push({
				label: '',
				bearing: bearing(a.stop.position, pointAlong(line, ahead)),
				to: b.stop.id,
				street,
				wayId: way.id
			});
			b.stop.exits.push({
				label: '',
				bearing: bearing(b.stop.position, pointAlong(line, behind)),
				to: a.stop.id,
				street,
				wayId: way.id
			});
		}
	}

	for (const stop of stops.values()) labelExits(stop.exits);
	return new StopGraph(stops);
}

/**
 * Names each exit by its nearest compass point. Exits that would share a name are named on
 * sixteen points instead, and any still sharing one carry their street name too.
 */
function labelExits(exits: Exit[]) {
	for (const e of exits) e.label = compassLabel(e.bearing);
	for (const group of collisions(exits))
		for (const e of group) e.label = compassLabel(e.bearing, 16);
	for (const group of collisions(exits)) {
		const plain = group.find((e) => !e.street) ?? group[0];
		for (const e of group) if (e !== plain) e.label = `${e.label} (${e.street ?? 'path'})`;
	}
}

function collisions(exits: Exit[]): Exit[][] {
	const byLabel = new Map<string, Exit[]>();
	for (const e of exits) byLabel.set(e.label, [...(byLabel.get(e.label) ?? []), e]);
	return [...byLabel.values()].filter((g) => g.length > 1);
}
