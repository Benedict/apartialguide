import type { Fact, SourceAdapter } from '../facts';
import type { AreaRecord } from '../areas';
import { distance, nearestOnPolyline, type LatLon } from '../geo';
import { elementRef, type OsmElement, type OsmIndex } from '../osm';
import { allowedClaims, concernsAPerson } from './personal';

/** One record from another source, as its fetch script took it. */
export interface SourceRecord {
	id: string;
	/** An OSM tag naming this record, which links it to the thing that carries it: fhrs:id=123. */
	link?: { key: string; value: string };
	/** An address to find the thing by. */
	address?: { number: string; street: string };
	/** Where the source places it. */
	at?: LatLon;
	/**
	 * A thing carrying this tag within so many metres is the one the record means: a bench for a
	 * bench, a road for a count of its traffic. Any of several values will do, and a way is measured
	 * to its nearest point.
	 */
	near?: { key: string; value: string | readonly string[]; within: number };
	/** A street the record is about, by name: it goes with every stretch of that street. */
	street?: string;
	/**
	 * The thing it is about, standing alone, when another source's records are about it too (a mine's
	 * plans in one, its returns in another): they join as one thing, each fact keeping its own source.
	 */
	thing?: string;
	/** When the source last had word of it, YYYY-MM-DD. */
	observed?: string;
	/** What the source says, every value as found. `name` also finds a thing of that name nearby. */
	claims: Record<string, string>;
}

/** A dated copy of one source's records about the place, taken by hand into data/records/. */
export interface RecordStore {
	/** The source, as it should be credited. */
	source: string;
	/** The prefix its facts carry: hygiene, listed, planning… */
	prefix: string;
	retrieved: string;
	records: SourceRecord[];
	/** Whether a record the map does not have stands as a thing of its own. Default true. */
	standalone?: boolean;
	/** Areas the source draws, such as wards, rather than things. */
	areas?: AreaRecord[];
	/** Whether its areas lie over the map as zones (flood zones), rather than dividing it (wards). */
	overlay?: boolean;
	/** What it keeps beyond the map's edge, told only when the reader looks beyond. */
	beyond?: { name?: string; kind: string; points: LatLon[] }[];
}

/** How near a thing of the same name must be to be the one a record means, in metres. */
const SAME_NAME_WITHIN = 50;

/**
 * Another source's records, as facts. A record goes with the thing the map links it to, or the
 * thing at its address, or a thing of its name close by; failing those, it stands where the
 * source puts it, a thing only that source has.
 */
export class RecordsAdapter implements SourceAdapter {
	readonly name: string;

	constructor(
		private readonly osm: OsmIndex,
		private readonly store: RecordStore,
		private readonly reach = { street: 15, feature: 30 }
	) {
		this.name = store.source;
	}

	facts(): Fact[] {
		const byTag = new Map<string, OsmElement>();
		const byAddress = new Map<string, OsmElement[]>();
		const byName = new Map<string, OsmElement[]>();
		const streets = new Map<string, OsmElement[]>();
		for (const e of this.osm.data.elements) {
			if (!e.tags || e.type === 'relation') continue;
			for (const [k, v] of Object.entries(e.tags)) byTag.set(`${k}=${v}`, e);
			const number = e.tags['addr:housenumber'];
			const street = e.tags['addr:street'];
			if (number && street) {
				const key = addressKey(number, street);
				byAddress.set(key, [...(byAddress.get(key) ?? []), e]);
			}
			const name = e.tags.name?.toLowerCase();
			if (name) byName.set(name, [...(byName.get(name) ?? []), e]);
			if (name && e.type === 'way' && e.tags.highway)
				streets.set(name, [...(streets.get(name) ?? []), e]);
		}
		const facts: Fact[] = [];
		for (const r of this.store.records) {
			if (r.street) {
				for (const way of streets.get(r.street.toLowerCase()) ?? []) {
					const geometry = this.geometry(way);
					if (geometry.length)
						facts.push(...this.claims(r, elementRef(way), geometry, this.reach.street));
				}
				continue;
			}
			const nearby = (byName.get(r.claims.name?.toLowerCase() ?? '') ?? []).find((e) => {
				const g = this.geometry(e);
				return !!r.at && g.length > 0 && distance(r.at, g[0]) <= SAME_NAME_WITHIN;
			});
			const thing =
				(r.link && byTag.get(`${r.link.key}=${r.link.value}`)) ||
				(r.address &&
					this.atAddress(r, byAddress.get(addressKey(r.address.number, r.address.street)))) ||
				nearby ||
				this.nearest(r);
			// What concerns a person more than a place is not told (`personal.ts`).
			if (concernsAPerson(this.store.prefix, r, thing)) continue;
			if (thing) {
				const geometry = this.geometry(thing);
				if (!geometry.length) continue;
				const reach =
					thing.type === 'way' && thing.tags?.highway ? this.reach.street : this.reach.feature;
				facts.push(...this.claims(r, elementRef(thing), geometry, reach));
			} else if (
				r.at &&
				(r.claims.name || r.claims.inscription || r.thing) &&
				this.store.standalone !== false
			) {
				// Standing alone, a record needs a name, or words of its own, to be called by, or to join a
				// thing another source names.
				facts.push(
					...this.claims(r, r.thing ?? `${this.store.prefix}/${r.id}`, [r.at], this.reach.feature)
				);
			}
		}
		return facts;
	}

	/**
	 * The thing at a record's address. An address more than one place shares (a High Street in two
	 * parts of a borough) is taken for the one nearest where the record lies, and for neither when
	 * the record lies nowhere, as either might be wrong.
	 */
	private atAddress(r: SourceRecord, found: OsmElement[] = []): OsmElement | undefined {
		if (found.length <= 1) return found[0];
		if (!r.at) return undefined;
		let best: { e: OsmElement; metres: number } | undefined;
		for (const e of found) {
			const g = this.geometry(e);
			if (!g.length) continue;
			const metres = distance(r.at, g[0]);
			if (!best || metres < best.metres) best = { e, metres };
		}
		return best?.e;
	}

	/** The nearest thing carrying the record's `near` tag, within its distance. */
	private nearest(r: SourceRecord): OsmElement | undefined {
		const near = r.near;
		if (!near || !r.at) return undefined;
		const values = typeof near.value === 'string' ? [near.value] : near.value;
		let best: { e: OsmElement; d: number } | undefined;
		for (const e of this.osm.data.elements) {
			const value = e.tags?.[near.key];
			if (value === undefined || !values.includes(value)) continue;
			const g = this.geometry(e);
			if (!g.length) continue;
			const d = nearestOnPolyline(r.at, g).metres;
			if (d <= near.within && (!best || d < best.d)) best = { e, d };
		}
		return best?.e;
	}

	private claims(r: SourceRecord, subject: string, geometry: LatLon[], reach: number): Fact[] {
		// Only the claims the source is allowed reach the prose and the page (`personal.ts`).
		return Object.entries(allowedClaims(this.store.prefix, r.claims))
			.filter(([, value]) => value !== '')
			.map(([key, value]) => ({
				id: `${this.store.prefix}:${r.id}:${key}:${subject}`,
				subject,
				claim: { key: `${this.store.prefix}:${key}`, value },
				source: this.store.source,
				observed: r.observed ?? this.store.retrieved,
				reach,
				geometry,
				elsewhere: true as const
			}));
	}

	private geometry(e: OsmElement): LatLon[] {
		if (e.type === 'node') return [[e.lat, e.lon]];
		return e.type === 'way' ? this.osm.wayGeometry(e) : [];
	}
}

const addressKey = (number: string, street: string) =>
	`${number.trim().toLowerCase()}|${street.trim().toLowerCase()}`;
