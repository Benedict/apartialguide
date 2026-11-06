import type { RecordStore, SourceRecord } from './adapters/records';
import type { OsmData } from './osm';

/**
 * Something a resident asked to have taken out of the walk, kept in the repository
 * (`data/suppressed.json`) and applied in every build after fetching and before narration, so it
 * stays out however often the sources are fetched again. Keyed by what does not change: an OSM
 * element (`node/123`), a record by its source and id (a planning reference, an FSA establishment
 * id), or an address, for one source or for all.
 */
export type Suppression = {
	/** When it was asked for, YYYY-MM-DD. */
	asked: string;
} & (
	| { osm: string }
	| { source: string; id: string }
	| { source?: string; address: { number: string; street: string } }
);

const addressKey = (number: string, street: string) =>
	`${number.trim().toLowerCase()}|${street.trim().toLowerCase()}`;

/** Other sources' records, without any the list takes out. */
export function suppressRecords(
	stores: RecordStore[],
	list: readonly Suppression[]
): RecordStore[] {
	if (!list.length) return stores;
	return stores.map((store) => {
		const mine = list.filter((s) => !('osm' in s) && (!s.source || s.source === store.prefix));
		if (!mine.length) return store;
		const ids = new Set(mine.flatMap((s) => ('id' in s ? [s.id] : [])));
		const places = new Set(
			mine.flatMap((s) => ('address' in s ? [addressKey(s.address.number, s.address.street)] : []))
		);
		const out = (r: SourceRecord) =>
			ids.has(r.id) || (!!r.address && places.has(addressKey(r.address.number, r.address.street)));
		return { ...store, records: store.records.filter((r) => !out(r)) };
	});
}

/**
 * The map, with nothing told of the elements the list takes out: their tags go, so they are no
 * longer things, names or streets, but their place stays, as a street drawn through one still runs.
 */
export function suppressElements(data: OsmData, list: readonly Suppression[]): OsmData {
	const refs = new Set(list.flatMap((s) => ('osm' in s ? [s.osm] : [])));
	if (!refs.size) return data;
	return {
		...data,
		elements: data.elements.map((e) => {
			if (!refs.has(`${e.type}/${e.id}`) || !e.tags) return e;
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { tags, ...rest } = e;
			return rest as typeof e;
		})
	};
}
