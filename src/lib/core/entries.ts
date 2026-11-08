import type { Tags } from './osm';

/** The ways into a mine the map marks: a shaft, an adit, a level, or the mine itself. */
const ENTRIES = new Set([
	'mineshaft',
	'mine_shaft',
	'adit',
	'mine_adit',
	'mine_level',
	'ventilation_shaft',
	'air_shaft',
	'mine',
	'mine_working',
	'mineral_extraction'
]);
/**
 * A name that ends in what it is, a way into a mine: Stray Park Mine, Daubuz Shaft Engine House
 * (South Wheal Frances), Engine house (disused), Nangiles Manway. Not a name that only begins so,
 * such as Mine Water Treatment Plant.
 */
export const NAMED_WAY_IN =
	/\b(mine|shaft|adit|level|engine house|whim|manway)\s*(\([^)]*\))?\s*$/i;
/** Things a walker goes to, whatever their name: a street, a shop, a pub, a museum. */
const GONE_TO = ['highway', 'amenity', 'shop', 'railway', 'tourism', 'leisure'];
/** Places people live, whatever their name: a hamlet called after a mine is still a hamlet. */
const LIVED_IN = new Set([
	'city',
	'town',
	'village',
	'hamlet',
	'suburb',
	'quarter',
	'neighbourhood',
	'isolated_dwelling',
	'farm'
]);
/** Words that make a borehole's name a way into a mine. */
const WAYS_IN = /\b(shaft|pit|adit|level)s?\b/i;
const KEYS = [
	'man_made',
	'ruins',
	'historic',
	'industrial',
	'archaeological_site',
	'disused:man_made',
	'abandoned:man_made',
	'disused:historic',
	'abandoned:historic',
	'disused:industrial',
	'abandoned:industrial'
];
/** Kinds of ground the map says something was taken from that are open to the sky, not ways in. */
const OPEN = new Set(['quarry']);

/**
 * Whether the map marks a way into a mine: a shaft, an adit or a mine, as marked, disused or
 * abandoned. Old shafts and adits are dangerous: the walk tells one by kind and name alone, never
 * which way it lies or how far, never as the nearest name, and plans no way to one.
 */
export const isMineEntry = (tags: Tags = {}) =>
	KEYS.some((k) => ENTRIES.has(tags[k] ?? '')) ||
	// Named as a mine, a shaft, an engine house over one, as Cornwall's map marks many.
	(!!tags.name &&
		NAMED_WAY_IN.test(tags.name) &&
		!GONE_TO.some((k) => tags[k]) &&
		!LIVED_IN.has(tags.place ?? '')) ||
	// Something the map says was mined, unless it is a quarry, open to the sky.
	(!!tags.mineral && !OPEN.has(tags.landuse ?? '') && !OPEN.has(tags['disused:landuse'] ?? '')) ||
	Object.entries(tags).some(
		([k, v]) =>
			// Another account's mine (its plans, its returns), standing alone where it lay.
			(k.endsWith(':kind') && ENTRIES.has(v)) ||
			// A borehole named for a way into a mine: a shaft, a pit, an adit, a level.
			(k === 'borehole:name' && WAYS_IN.test(v)) ||
			// Another account's thing named as a mine, a shaft or an engine house.
			(k.endsWith(':name') && NAMED_WAY_IN.test(v))
	);
