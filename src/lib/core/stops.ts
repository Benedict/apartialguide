import {
	alongPolyline,
	bearing,
	compassLabel,
	distance,
	pointAlong,
	polylineLength,
	type LatLon
} from './geo';
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
	/** A junction joins streets, ends one, or is where one changes its name; a corridor stop sits part way along a street. */
	kind: 'junction' | 'corridor';
	exits: Exit[];
	/** Points along the streets from here to halfway to the next stops: what the stop takes in. */
	stretch: LatLon[];
}

export interface StopGraphOptions {
	/** Largest gap between stops along a street, in metres. */
	spacing?: number;
	/** Other places to stop beside, as named places are: plaques another account records. */
	landmarks?: readonly LatLon[];
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

/** Ways the map draws that no one would call a way to go: they make no place to stop. */
const MINOR_SERVICE = new Set(['driveway', 'parking_aisle', 'drive-through', 'emergency_access']);
export const isMinor = (way: OsmWay) => {
	const t = way.tags ?? {};
	return (
		MINOR_SERVICE.has(t.service) ||
		t.footway === 'sidewalk' ||
		t.footway === 'crossing' ||
		t.cycleway === 'crossing' ||
		t.path === 'crossing'
	);
};

export const junctionId = (nodeId: number): StopId => `n${nodeId}`;

/** How far ahead to look when judging which way a street leaves a stop. */
const HEADING_LOOKAHEAD_M = 15;
/** Junctions drawn closer than this are one place. */
const MERGE_M = 15;
/** An unnamed way that leads nowhere, shorter than this, is no way to go. */
const STUB_M = 25;
/** A named place within this of a street has a stop beside it, unless another stop is near. */
const PLACE_REACH_M = 25;
const PLACE_GAP_M = 60;
/** How far apart the points a stop takes in are set along its streets. */
const STRETCH_STEP_M = 20;

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

interface Edge {
	to: number;
	way: OsmWay;
}

/** A street's name, as a reader would know it: its name, or its number. */
const nameOf = (way: OsmWay) => way.tags?.name ?? way.tags?.ref;

/**
 * Stops where a walker would stop: where streets and paths meet, where one ends, where a street
 * changes its name, beside named places along a street, and on a long street at most `spacing`
 * metres apart. Driveways, parking aisles, pavements and crossings make no stop, nor does a short
 * unnamed way that leads nowhere; a junction drawn as several close nodes is one stop.
 */
export function buildStopGraph(
	osm: OsmIndex,
	{ spacing = 150, landmarks = [] }: StopGraphOptions = {}
): StopGraph {
	const ways = osm.ways.filter((w) => isWalkable(w) && !isMinor(w));
	const at = (id: number): LatLon => {
		const n = osm.nodes.get(id)!;
		return [n.lat, n.lon];
	};

	// The street network as edges between nodes.
	const edges = new Map<number, Edge[]>();
	const link = (a: number, b: number, way: OsmWay) => {
		edges.set(a, [...(edges.get(a) ?? []), { to: b, way }]);
		edges.set(b, [...(edges.get(b) ?? []), { to: a, way }]);
	};
	for (const way of ways) {
		const present = way.nodes.filter((id) => osm.nodes.has(id));
		for (let i = 1; i < present.length; i++)
			if (present[i] !== present[i - 1]) link(present[i - 1], present[i], way);
	}
	bridge(osm, edges, link);
	const degree = (id: number) => edges.get(id)?.length ?? 0;
	const unlink = (a: number, b: number) => {
		const drop = (x: number, y: number) => {
			const i = edges.get(x)?.findIndex((e) => e.to === y) ?? -1;
			if (i >= 0) edges.get(x)!.splice(i, 1);
			if (!edges.get(x)?.length) edges.delete(x);
		};
		drop(a, b);
		drop(b, a);
	};

	// From an end, along nodes where nothing joins, to the next place something does.
	const chainFrom = (start: number, first: Edge) => {
		const nodes = [start];
		const steps: Edge[] = [];
		let edge: Edge | undefined = first;
		while (edge) {
			steps.push(edge);
			const prev = nodes[nodes.length - 1];
			nodes.push(edge.to);
			if (isKey(edge.to) || edge.to === start) break;
			edge = edges.get(edge.to)!.find((e) => e.to !== prev) ?? undefined;
		}
		return { nodes, steps };
	};
	const lengthOf = (nodes: number[]) => polylineLength(nodes.map(at));

	// A place to stop: anything but the middle of one street.
	function isKey(id: number): boolean {
		const d = degree(id);
		if (d !== 2) return d > 0;
		const [a, b] = edges.get(id)!;
		return nameOf(a.way) !== nameOf(b.way);
	}

	// Unnamed ways that lead nowhere are pruned, until none are left: a few metres of anything,
	// or an unnamed service road of any length, which is a driveway in all but its tag.
	for (let pruned = true; pruned;) {
		pruned = false;
		for (const id of [...edges.keys()]) {
			if (degree(id) !== 1) continue;
			const { nodes, steps } = chainFrom(id, edges.get(id)![0]);
			if (degree(nodes.at(-1)!) < 3) continue;
			if (steps.some((e) => nameOf(e.way))) continue;
			const service = steps.every((e) => e.way.tags?.highway === 'service');
			if (!service && lengthOf(nodes) >= STUB_M) continue;
			for (let i = 1; i < nodes.length; i++) unlink(nodes[i - 1], nodes[i]);
			pruned = true;
		}
	}

	// Junctions drawn as several close nodes are one place.
	const root = new Map<number, number>();
	const find = (id: number): number => {
		const r = root.get(id) ?? id;
		if (r === id) return id;
		const top = find(r);
		root.set(id, top);
		return top;
	};
	const keys = [...edges.keys()].filter(isKey).sort((a, b) => a - b);
	for (const id of keys) {
		if (degree(id) < 3) continue;
		for (const e of edges.get(id)!) {
			const { nodes } = chainFrom(id, e);
			const end = nodes.at(-1)!;
			if (end !== id && degree(end) >= 3 && lengthOf(nodes) < MERGE_M) {
				const [a, b] = [find(id), find(end)];
				if (a !== b) root.set(Math.max(a, b), Math.min(a, b));
			}
		}
	}

	const stops = new Map<StopId, Stop>();
	const members = new Map<number, number[]>();
	for (const id of keys) members.set(find(id), [...(members.get(find(id)) ?? []), id]);
	const keyStop = (id: number): Stop => {
		const top = find(id);
		const sid = junctionId(top);
		let stop = stops.get(sid);
		if (!stop) {
			const points = (members.get(top) ?? [top]).map(at);
			const position: LatLon = [
				points.reduce((s, p) => s + p[0], 0) / points.length,
				points.reduce((s, p) => s + p[1], 0) / points.length
			];
			stop = { id: sid, position, kind: 'junction', exits: [], stretch: [] };
			stops.set(sid, stop);
		}
		return stop;
	};

	const places = [...namedPlaces(osm), ...landmarks];
	const walked = new Set<string>();
	let chains = 0;
	for (const id of keys)
		for (const e of edges.get(id) ?? []) {
			const key = `${id}>${e.to}`;
			if (walked.has(key)) continue;
			const { nodes, steps } = chainFrom(id, e);
			for (let i = 1; i < nodes.length; i++) {
				walked.add(`${nodes[i - 1]}>${nodes[i]}`);
				walked.add(`${nodes[i]}>${nodes[i - 1]}`);
			}
			const [from, to] = [keyStop(nodes[0]), keyStop(nodes.at(-1)!)];
			if (from === to && lengthOf(nodes) < MERGE_M) continue;
			linkAlong(chains++, nodes.map(at), steps, from, to);
		}

	function linkAlong(n: number, line: LatLon[], steps: Edge[], from: Stop, to: Stop) {
		const length = polylineLength(line);
		if (length === 0) return;
		// Where along the line each step's way begins, to know which way a stop leaves by.
		const wayAt = (metres: number) => {
			let walkedTo = 0;
			for (let i = 0; i < steps.length; i++) {
				walkedTo += distance(line[i], line[i + 1]);
				if (metres < walkedTo) return steps[i].way;
			}
			return steps[steps.length - 1].way;
		};
		const marks = stopsAlong(line, length, places, spacing);
		const chain: { stop: Stop; at: number }[] = [{ stop: from, at: 0 }];
		marks.forEach((metres, k) => {
			const stop: Stop = {
				id: `w${wayAt(metres).id}.${n}.${k + 1}`,
				position: pointAlong(line, metres),
				kind: 'corridor',
				exits: [],
				stretch: []
			};
			stops.set(stop.id, stop);
			chain.push({ stop, at: metres });
		});
		chain.push({ stop: to, at: length });

		for (let i = 1; i < chain.length; i++) {
			const a = chain[i - 1];
			const b = chain[i];
			const ahead = Math.min(a.at + HEADING_LOOKAHEAD_M, b.at);
			const behind = Math.max(b.at - HEADING_LOOKAHEAD_M, a.at);
			const forward = wayAt(a.at + 0.01);
			const back = wayAt(b.at - 0.01);
			a.stop.exits.push({
				label: '',
				bearing: bearing(a.stop.position, pointAlong(line, ahead)),
				to: b.stop.id,
				street: nameOf(forward),
				wayId: forward.id
			});
			b.stop.exits.push({
				label: '',
				bearing: bearing(b.stop.position, pointAlong(line, behind)),
				to: a.stop.id,
				street: nameOf(back),
				wayId: back.id
			});
			// Each stop takes in its half of the street between them.
			const half = (b.at - a.at) / 2;
			for (let m = STRETCH_STEP_M; m <= half; m += STRETCH_STEP_M) {
				a.stop.stretch.push(pointAlong(line, a.at + m));
				b.stop.stretch.push(pointAlong(line, b.at - m));
			}
		}
	}

	for (const stop of stops.values()) labelExits(stop.exits);
	return new StopGraph(stops);
}

/**
 * Pavements and crossings make no place to stop, but where they alone join one part of the network
 * to another (across a main road no one walks along, say), the shortest such way is kept, so no
 * street is cut off from the rest. From the largest part, the nearest other is joined, until none is left.
 */
function bridge(
	osm: OsmIndex,
	edges: Map<number, Edge[]>,
	link: (a: number, b: number, way: OsmWay) => void
) {
	const minor = new Map<number, { to: number; way: OsmWay; metres: number }[]>();
	for (const way of osm.ways.filter((w) => isWalkable(w) && isMinor(w))) {
		const present = way.nodes.filter((id) => osm.nodes.has(id));
		for (let i = 1; i < present.length; i++) {
			const [a, b] = [present[i - 1], present[i]];
			if (a === b) continue;
			const metres = distance(
				[osm.nodes.get(a)!.lat, osm.nodes.get(a)!.lon],
				[osm.nodes.get(b)!.lat, osm.nodes.get(b)!.lon]
			);
			minor.set(a, [...(minor.get(a) ?? []), { to: b, way, metres }]);
			minor.set(b, [...(minor.get(b) ?? []), { to: a, way, metres }]);
		}
	}
	if (!minor.size) return;
	// Which part of the street network each node lies in.
	const part = new Map<number, number>();
	const sizes = new Map<number, number>();
	for (const start of edges.keys()) {
		if (part.has(start)) continue;
		const queue = [start];
		part.set(start, start);
		let size = 0;
		while (queue.length) {
			const id = queue.pop()!;
			size++;
			for (const e of edges.get(id) ?? [])
				if (!part.has(e.to)) {
					part.set(e.to, start);
					queue.push(e.to);
				}
		}
		sizes.set(start, size);
	}
	if (sizes.size < 2) return;
	const main = [...sizes].sort((a, b) => b[1] - a[1])[0][0];
	const members = new Map<number, number[]>();
	for (const [id, p] of part) {
		const list = members.get(p);
		if (list) list.push(id);
		else members.set(p, [id]);
	}
	// One search outward from the largest part, along pavements and crossings: each time it reaches
	// another part, the way there is kept, that part joins the largest, and the search goes on from
	// it too, rather than starting again, so joining many small parts costs one search, not many.
	const metres = new Map<number, number>();
	const came = new Map<number, { from: number; way: OsmWay }>();
	const heap = new Heap();
	const from = (id: number) => {
		if (minor.has(id) && (metres.get(id) ?? Infinity) > 0) {
			metres.set(id, 0);
			came.delete(id);
			heap.push(id, 0);
		}
	};
	for (const id of members.get(main)!) from(id);
	while (heap.size) {
		const [id, m] = heap.pop();
		if (m > metres.get(id)!) continue;
		const p = part.get(id);
		if (p !== undefined && p !== main) {
			const path: number[] = [];
			for (let at = id; came.has(at); at = came.get(at)!.from) {
				link(came.get(at)!.from, at, came.get(at)!.way);
				path.push(came.get(at)!.from);
			}
			const joined = members.get(p)!;
			for (const n of joined) part.set(n, main);
			for (const n of path) part.set(n, main);
			for (const n of [...joined, ...path]) from(n);
			continue;
		}
		for (const e of minor.get(id) ?? []) {
			const next = m + e.metres;
			if (next < (metres.get(e.to) ?? Infinity)) {
				metres.set(e.to, next);
				came.set(e.to, { from: id, way: e.way });
				heap.push(e.to, next);
			}
		}
	}
}

/** A smallest-first queue of nodes by distance. */
class Heap {
	private readonly items: [number, number][] = [];
	get size() {
		return this.items.length;
	}
	push(id: number, metres: number) {
		const a = this.items;
		a.push([id, metres]);
		for (let i = a.length - 1; i > 0;) {
			const up = (i - 1) >> 1;
			if (a[up][1] <= a[i][1]) break;
			[a[up], a[i]] = [a[i], a[up]];
			i = up;
		}
	}
	pop(): [number, number] {
		const a = this.items;
		const top = a[0];
		const last = a.pop()!;
		if (a.length) {
			a[0] = last;
			for (let i = 0; ;) {
				const [l, r] = [2 * i + 1, 2 * i + 2];
				let m = i;
				if (l < a.length && a[l][1] < a[m][1]) m = l;
				if (r < a.length && a[r][1] < a[m][1]) m = r;
				if (m === i) break;
				[a[m], a[i]] = [a[i], a[m]];
				i = m;
			}
		}
		return top;
	}
}

/** Named things that are not streets: the places a walker might stop beside. */
function namedPlaces(osm: OsmIndex): LatLon[] {
	const places: LatLon[] = [];
	for (const e of osm.data.elements) {
		const t = e.tags;
		if (!t?.name || t.highway || t.boundary || t.place || t.landuse || t.route || t.waterway)
			continue;
		if (e.type === 'node') places.push([e.lat, e.lon]);
		else {
			const g =
				e.type === 'way'
					? osm.wayGeometry(e)
					: osm
							.relationRings(e)
							.outer.reduce<LatLon[]>((a, b) => (b.length > a.length ? b : a), []);
			if (g.length)
				places.push([
					g.reduce((s, p) => s + p[0], 0) / g.length,
					g.reduce((s, p) => s + p[1], 0) / g.length
				]);
		}
	}
	return places;
}

/**
 * Where along a street, between its two ends, to put stops: beside named places (those close
 * together sharing one), and then wherever the gap would still be longer than `spacing`.
 */
function stopsAlong(
	line: LatLon[],
	length: number,
	places: readonly LatLon[],
	spacing: number
): number[] {
	const [s, w, n, e] = boxAround(line, PLACE_REACH_M);
	const near = places
		.filter(([lat, lon]) => lat >= s && lat <= n && lon >= w && lon <= e)
		.map((p) => alongPolyline(p, line))
		.filter(
			(p) => p.metres <= PLACE_REACH_M && p.along >= PLACE_GAP_M && p.along <= length - PLACE_GAP_M
		)
		.map((p) => p.along)
		.sort((a, b) => a - b);
	// Places close together share a stop, at the middle of them.
	const groups: number[][] = [];
	for (const m of near) {
		const last = groups.at(-1);
		if (last && m - last[0] < PLACE_GAP_M) last.push(m);
		else groups.push([m]);
	}
	const marks = groups.map((g) => (g[0] + g[g.length - 1]) / 2);
	const all = [0, ...marks, length];
	const filled: number[] = [];
	for (let i = 1; i < all.length; i++) {
		const gap = all[i] - all[i - 1];
		const parts = Math.max(1, Math.ceil(gap / spacing));
		for (let k = 1; k < parts; k++) filled.push(all[i - 1] + (gap * k) / parts);
		if (i < all.length - 1) filled.push(all[i]);
	}
	return filled;
}

/** The bounding box of a line, widened by `metres`: south, west, north, east. */
function boxAround(line: LatLon[], metres: number): [number, number, number, number] {
	const dLat = metres / 111_320;
	const dLon = dLat / Math.cos((line[0][0] * Math.PI) / 180);
	return [
		Math.min(...line.map((p) => p[0])) - dLat,
		Math.min(...line.map((p) => p[1])) - dLon,
		Math.max(...line.map((p) => p[0])) + dLat,
		Math.max(...line.map((p) => p[1])) + dLon
	];
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
