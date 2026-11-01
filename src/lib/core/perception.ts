import type { Fact } from './facts';
import {
	flatProjection,
	insideRing,
	nearestOnPolyline,
	segmentsIntersect,
	type LatLon
} from './geo';
import { boxOf, Grid } from './grid';
import { elementRef, type OsmIndex } from './osm';

interface Occluder {
	subject: string;
	ring: LatLon[];
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
		const occluders = [
			...osm.ways
				.filter((w) => w.tags?.building && w.nodes.length > 3 && w.nodes[0] === w.nodes.at(-1))
				.map((w) => ({ subject: elementRef(w), ring: osm.wayGeometry(w) })),
			// A building drawn as a multipolygon blocks the view at each of its outer rings.
			...osm.relations
				.filter((r) => r.tags?.building)
				.flatMap((r) =>
					osm.relationRings(r).outer.map((ring) => ({ subject: elementRef(r), ring }))
				)
		];
		return new Perception(facts, occluders);
	}

	inView(at: LatLon): Fact[] {
		const visible = new Map<string, boolean>();
		// A thing's facts share its geometry: measured once, however many there are.
		const measured = new Map<readonly LatLon[], { point: LatLon; metres: number }>();
		const measure = (line: readonly LatLon[]) => {
			let m = measured.get(line);
			if (!m) measured.set(line, (m = nearestOnPolyline(at, line)));
			return m;
		};
		const near = [...this.factGrid.near(boxOf([at]))].sort((a, b) => a - b);
		return near
			.map((i) => this.facts[i])
			.filter((f) => {
				const nearest = measure(f.geometry);
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
