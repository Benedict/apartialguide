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
export class Perception {
	constructor(
		private readonly facts: readonly Fact[],
		private readonly occluders: readonly Occluder[]
	) {}

	static fromOsm(osm: OsmIndex, facts: readonly Fact[]): Perception {
		const occluders = osm.ways
			.filter((w) => w.tags?.building && w.nodes.length > 3 && w.nodes[0] === w.nodes.at(-1))
			.map((w) => ({ subject: elementRef(w), ring: osm.wayGeometry(w) }));
		return new Perception(facts, occluders);
	}

	inView(at: LatLon): Fact[] {
		const visible = new Map<string, boolean>();
		return this.facts.filter((f) => {
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
		return this.occluders.some((o) => {
			if (o.subject === subject || insideRing(to, o.ring)) return false;
			for (let i = 1; i < o.ring.length; i++) {
				if (segmentsIntersect(a, b, xy(o.ring[i - 1]), xy(o.ring[i]))) return true;
			}
			return false;
		});
	}
}
