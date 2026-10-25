import type { Fact, SourceAdapter } from '../facts';
import type { LatLon } from '../geo';
import { elementRef, type OsmElement, type OsmIndex } from '../osm';

/** What Wikidata holds about one item, as the Wikidata script took it. */
export interface WikidataItem {
	label?: string;
	description?: string;
	/** The item's inception, as a year or a date. */
	inception?: string;
	/** Where Wikidata places it, if it does. */
	coordinates?: LatLon;
}

/** A dated copy of the Wikidata items about a place, taken by `npm run wikidata`. */
export interface WikidataStore {
	/** When the items were taken, YYYY-MM-DD. */
	retrieved: string;
	items: Record<string, WikidataItem>;
}

/**
 * Another account of the place. An item the map links to (`wikidata`) describes that thing; an
 * item it is named for (`name:etymology:wikidata`) says who or what; an item Wikidata places here
 * that the map does not link to is a thing of its own.
 */
export class WikidataAdapter implements SourceAdapter {
	readonly name = 'wikidata';

	constructor(
		private readonly osm: OsmIndex,
		private readonly store: WikidataStore,
		/** As far as the map's own facts reach: streets less far than the things beside them. */
		private readonly reach = { street: 15, feature: 30 }
	) {}

	facts(): Fact[] {
		const facts: Fact[] = [];
		const linked = new Set<string>();
		for (const e of this.osm.data.elements) {
			if (!e.tags || e.type === 'relation') continue;
			const geometry = this.geometry(e);
			if (!geometry.length) continue;
			const subject = elementRef(e);
			const reach = e.type === 'way' && e.tags.highway ? this.reach.street : this.reach.feature;
			const itself = this.item(e.tags.wikidata, linked);
			if (itself) {
				this.push(facts, subject, 'wikidata:description', itself.description, geometry, reach);
				this.push(facts, subject, 'wikidata:inception', itself.inception, geometry, reach);
			}
			const namesake = this.item(e.tags['name:etymology:wikidata'], linked);
			if (namesake) {
				this.push(facts, subject, 'etymology:label', namesake.label, geometry, reach);
				this.push(facts, subject, 'etymology:description', namesake.description, geometry, reach);
			}
		}
		for (const [qid, item] of Object.entries(this.store.items)) {
			if (linked.has(qid) || !item.coordinates) continue;
			const subject = `wikidata/${qid}`;
			const geometry = [item.coordinates];
			this.push(facts, subject, 'wikidata:label', item.label, geometry);
			this.push(facts, subject, 'wikidata:description', item.description, geometry);
			this.push(facts, subject, 'wikidata:inception', item.inception, geometry);
		}
		return facts;
	}

	private item(qid: string | undefined, linked: Set<string>): WikidataItem | undefined {
		if (!qid) return undefined;
		linked.add(qid);
		return this.store.items[qid];
	}

	private geometry(e: OsmElement): LatLon[] {
		if (e.type === 'node') return [[e.lat, e.lon]];
		return e.type === 'way' ? this.osm.wayGeometry(e) : [];
	}

	private push(
		facts: Fact[],
		subject: string,
		key: string,
		value: string | undefined,
		geometry: LatLon[],
		reach = this.reach.feature
	) {
		if (value === undefined) return;
		facts.push({
			id: `wikidata:${subject}:${key}`,
			subject,
			claim: { key, value },
			source: this.name,
			observed: this.store.retrieved,
			reach,
			geometry
		});
	}
}
