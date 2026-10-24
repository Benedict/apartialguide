import type { Fact, SourceAdapter } from '../facts';
import { distanceToPolyline, type LatLon } from '../geo';
import { elementRef, type OsmElement, type OsmIndex, type Tags } from '../osm';

/** The map of the same place as it stood on an earlier date. */
export interface PastMap {
	/** The date the map stood as, YYYY-MM-DD. */
	asOf: string;
	osm: OsmIndex;
}

/** Keys that make a thing worth remembering once it has gone. */
const REMARKABLE = [
	'name',
	'shop',
	'amenity',
	'craft',
	'office',
	'leisure',
	'tourism',
	'healthcare',
	'historic',
	'building'
];
/** Linear things that get re-cut into new pieces rather than lost: streets, rails, power lines. */
const isInfrastructure = (e: OsmElement) =>
	e.type === 'way' && !!(e.tags?.highway || e.tags?.railway || e.tags?.power);

/** How near a same-named thing must stand for a gone thing to count as merely redrawn, in metres. */
const REDRAWN_WITHIN = 30;

const isProvenance = (key: string) =>
	key === 'created_by' || key === 'source' || key.startsWith('source:');

/**
 * Compares past maps with the current one. What has gone is remembered as `was:` facts, dated by
 * the last past map that had it; an older name of something still there is a `was:name` fact.
 */
export class HistoryAdapter implements SourceAdapter {
	readonly name = 'osm-history';

	constructor(
		private readonly current: OsmIndex,
		private readonly past: readonly PastMap[],
		private readonly reach = 30
	) {}

	facts(): Fact[] {
		const now = new Map(this.current.data.elements.map((e) => [elementRef(e), e]));
		const gone = new Map<string, { element: OsmElement; asOf: string; osm: OsmIndex }>();
		const oldNames = new Map<string, Map<string, string>>();

		for (const { asOf, osm } of [...this.past].sort((a, b) => a.asOf.localeCompare(b.asOf))) {
			for (const e of osm.data.elements) {
				if (!e.tags || e.type === 'relation' || isInfrastructure(e)) continue;
				const ref = elementRef(e);
				const present = now.get(ref);
				// A thing stripped of all its tags is gone too, though its id lives on.
				if (!present || !present.tags) {
					if (REMARKABLE.some((k) => e.tags![k])) gone.set(ref, { element: e, asOf, osm });
				} else if (e.tags.name && e.tags.name !== present.tags?.name) {
					const names = oldNames.get(ref) ?? new Map<string, string>();
					names.delete(e.tags.name);
					names.set(e.tags.name, asOf);
					oldNames.set(ref, names);
				}
			}
		}

		const named = new Map<string, LatLon[][]>();
		for (const e of this.current.data.elements) {
			const name = e.tags?.name;
			if (name) named.set(name, [...(named.get(name) ?? []), this.geometry(e, this.current)]);
		}
		const redrawn = (name: string | undefined, geometry: LatLon[]) =>
			!!name &&
			(named.get(name) ?? []).some(
				(g) => g.length && geometry.some((p) => distanceToPolyline(p, g) <= REDRAWN_WITHIN)
			);

		const facts: Fact[] = [];
		for (const [ref, { element, asOf, osm }] of gone) {
			const geometry = this.geometry(element, osm);
			if (geometry.length === 0 || redrawn(element.tags?.name, geometry)) continue;
			for (const [key, value] of Object.entries(element.tags as Tags)) {
				if (!isProvenance(key)) facts.push(this.fact(ref, `was:${key}`, value, asOf, geometry));
			}
		}
		for (const [ref, names] of oldNames) {
			const geometry = this.geometry(now.get(ref)!, this.current);
			for (const [value, asOf] of names)
				facts.push(this.fact(ref, 'was:name', value, asOf, geometry));
		}
		return facts;
	}

	private geometry(e: OsmElement, osm: OsmIndex): LatLon[] {
		if (e.type === 'node') return [[e.lat, e.lon]];
		return e.type === 'way' ? osm.wayGeometry(e) : [];
	}

	private fact(
		subject: string,
		key: string,
		value: string,
		asOf: string,
		geometry: LatLon[]
	): Fact {
		return {
			id: `history:${subject}:${key}:${asOf}:${value}`,
			subject,
			claim: { key, value },
			source: this.name,
			observed: asOf,
			reach: this.reach,
			geometry
		};
	}
}
