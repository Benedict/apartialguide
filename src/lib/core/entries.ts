import type { Tags } from './osm';

/** The ways into a mine the map marks: a shaft, an adit, or the mine itself. */
const ENTRIES = new Set(['mineshaft', 'mine_shaft', 'adit', 'mine_adit', 'mine']);
const KEYS = ['man_made', 'historic', 'disused:man_made', 'abandoned:man_made', 'disused:historic'];

/**
 * Whether the map marks a way into a mine: a shaft, an adit or a mine, as marked, disused or
 * abandoned. Old shafts and adits are dangerous: the walk tells one by kind and name alone, never
 * which way it lies or how far, never as the nearest name, and plans no way to one.
 */
export const isMineEntry = (tags: Tags = {}) => KEYS.some((k) => ENTRIES.has(tags[k] ?? ''));
