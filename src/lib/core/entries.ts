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
	'mineral_extraction'
]);
/** Words that make a borehole's name a way into a mine. */
const WAYS_IN = /\b(shaft|pit|adit|level)s?\b/i;
const KEYS = [
	'man_made',
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
	// Something the map says was mined, unless it is a quarry, open to the sky.
	(!!tags.mineral && !OPEN.has(tags.landuse ?? '') && !OPEN.has(tags['disused:landuse'] ?? '')) ||
	Object.entries(tags).some(
		([k, v]) =>
			// Another account's mine (its plans, its returns), standing alone where it lay.
			(k.endsWith(':kind') && ENTRIES.has(v)) ||
			// A borehole named for a way into a mine: a shaft, a pit, an adit, a level.
			(k === 'borehole:name' && WAYS_IN.test(v))
	);
