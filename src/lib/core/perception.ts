import type { Fact } from './facts';
import {
	flatProjection,
	insideRing,
	nearestOnPolyline,
	segmentsIntersect,
	type LatLon
} from './geo';
import { elementRef, type OsmIndex } from './osm';

interface Occluder {
	subject: string;
	ring: LatLon[];
}

/**
 * What can be perceived from a point: facts within their reach, unless a mapped building
 * stands in the way. Where nothing is mapped, nothing blocks the view.
 */
/** Cells of about 55 m: each fact and building is filed under every cell it can matter in. */
const CELL_LAT = 0.0005;
const CELL_LON = 0.0008;
/** Metres per degree of latitude, near enough for filing things in cells. */
const METRES_PER_DEGREE = 111_320;

type Box = [number, number, number, number];

function boxOf(points: readonly LatLon[], metres = 0): Box {
	const lats = points.map((p) => p[0]);
	const lons = points.map((p) => p[1]);
	const dLat = metres / METRES_PER_DEGREE;
	const dLon = dLat / Math.cos((lats[0] * Math.PI) / 180);
	return [
		Math.min(...lats) - dLat,
		Math.min(...lons) - dLon,
		Math.max(...lats) + dLat,
		Math.max(...lons) + dLon
	];
}

function* cellsOf([s, w, n, e]: Box): Generator<string> {
	for (let i = Math.floor(s / CELL_LAT); i <= Math.floor(n / CELL_LAT); i++)
		for (let j = Math.floor(w / CELL_LON); j <= Math.floor(e / CELL_LON); j++) yield `${i},${j}`;
}

/** Things filed by cell, to look up only what is near. */
class Grid<T> {
	private readonly cells = new Map<string, T[]>();

	add(item: T, box: Box) {
		for (const c of cellsOf(box)) {
			const list = this.cells.get(c);
			if (list) list.push(item);
			else this.cells.set(c, [item]);
		}
	}

	near(box: Box): Set<T> {
		const found = new Set<T>();
		for (const c of cellsOf(box)) for (const item of this.cells.get(c) ?? []) found.add(item);
		return found;
	}
}

/**
 * What can be perceived from a point: facts within their reach, unless a mapped building
 * stands in the way. Where nothing is mapped, nothing blocks the view. Facts and buildings are
 * filed in a grid, so a large map is as quick to look about in as a small one.
 */
export class Perception {
	private readonly factGrid = new Grid<number>();
	private readonly occluderGrid = new Grid<Occluder>();

	constructor(
		private readonly facts: readonly Fact[],
		occluders: readonly Occluder[]
	) {
		facts.forEach((f, i) => {
			if (f.geometry.length) this.factGrid.add(i, boxOf(f.geometry, f.reach));
		});
		for (const o of occluders) this.occluderGrid.add(o, boxOf(o.ring));
	}

	static fromOsm(osm: OsmIndex, facts: readonly Fact[]): Perception {
		const occluders = osm.ways
			.filter((w) => w.tags?.building && w.nodes.length > 3 && w.nodes[0] === w.nodes.at(-1))
			.map((w) => ({ subject: elementRef(w), ring: osm.wayGeometry(w) }));
		return new Perception(facts, occluders);
	}

	inView(at: LatLon): Fact[] {
		const visible = new Map<string, boolean>();
		const near = [...this.factGrid.near(boxOf([at]))].sort((a, b) => a - b);
		return near
			.map((i) => this.facts[i])
			.filter((f) => {
				const nearest = nearestOnPolyline(at, f.geometry);
				if (nearest.metres > f.reach) return false;
				const key = f.subject;
				if (!visible.has(key)) visible.set(key, !this.blocked(at, nearest.point, f.subject));
				return visible.get(key);
			});
	}

	private blocked(from: LatLon, to: LatLon, subject: string): boolean {
		const xy = flatProjection(from);
		const a = xy(from);
		const b = xy(to);
		for (const o of this.occluderGrid.near(boxOf([from, to]))) {
			if (o.subject === subject || insideRing(to, o.ring)) continue;
			for (let i = 1; i < o.ring.length; i++) {
				if (segmentsIntersect(a, b, xy(o.ring[i - 1]), xy(o.ring[i]))) return true;
			}
		}
		return false;
	}
}
