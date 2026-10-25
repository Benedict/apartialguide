import type { Fact, SourceAdapter } from '../facts';
import { distance, type LatLon } from '../geo';
import { elementRef, type OsmElement, type OsmIndex } from '../osm';

/** One record from another source, as its fetch script took it. */
export interface SourceRecord {
	id: string;
	/** An OSM tag naming this record, which links it to the thing that carries it: fhrs:id=123. */
	link?: { key: string; value: string };
	/** An address to find the thing by. */
	address?: { number: string; street: string };
	/** Where the source places it. */
	at?: LatLon;
	/** A street the record is about, by name: it goes with every stretch of that street. */
	street?: string;
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
		const byAddress = new Map<string, OsmElement>();
		const byName = new Map<string, OsmElement[]>();
		const streets = new Map<string, OsmElement[]>();
		for (const e of this.osm.data.elements) {
			if (!e.tags || e.type === 'relation') continue;
			for (const [k, v] of Object.entries(e.tags)) byTag.set(`${k}=${v}`, e);
			const number = e.tags['addr:housenumber'];
			const street = e.tags['addr:street'];
			if (number && street) byAddress.set(addressKey(number, street), e);
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
				(r.address && byAddress.get(addressKey(r.address.number, r.address.street))) ||
				nearby;
			if (thing) {
				const geometry = this.geometry(thing);
				if (!geometry.length) continue;
				const reach =
					thing.type === 'way' && thing.tags?.highway ? this.reach.street : this.reach.feature;
				facts.push(...this.claims(r, elementRef(thing), geometry, reach));
			} else if (r.at && this.store.standalone !== false) {
				facts.push(...this.claims(r, `${this.store.prefix}/${r.id}`, [r.at], this.reach.feature));
			}
		}
		return facts;
	}

	private claims(r: SourceRecord, subject: string, geometry: LatLon[], reach: number): Fact[] {
		return Object.entries(r.claims)
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
