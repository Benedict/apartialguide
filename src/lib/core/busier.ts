import type { Scene } from './scene';
import { isBackground, type Beat } from './slippage';
import { isElsewhere, isHistory } from './tensions';
import { keptOutOfProse } from './keepers';

/** Tensions in a thing's telling that make a stop worth prose of its own. */
const TELLING = new Set(['spoken-as-found', 'self-correction', 'remembered', 'was-here']);

/** Open ground a stop lies in or beside: a park, a golf course, a wood. */
const GROUND: Record<string, ReadonlySet<string>> = {
	leisure: new Set([
		'park',
		'golf_course',
		'nature_reserve',
		'common',
		'garden',
		'recreation_ground'
	]),
	landuse: new Set(['recreation_ground', 'grass', 'meadow', 'forest']),
	natural: new Set(['wood', 'heath', 'scrub', 'grassland'])
};

/** A beat about open ground, its name and others' accounts of it included. */
const isGround = (b: Beat) =>
	b.facts.some((f) => !isElsewhere(f) && GROUND[f.claim.key]?.has(f.claim.value));

/**
 * An ended postcode, standing alone by its code: it alone would have a quiet street's every stop told
 * at length for one line of hearsay, so it is told, but by the template.
 */
const isEndedPostcode = (b: Beat) =>
	b.facts.some(
		(f) => isElsewhere(f) && f.claim.key === 'postcode:kind' && f.claim.value === 'postcode'
	);

/**
 * Whether a stop's data has something going on: a named thing, another account, something gone or
 * renamed, a broken name. Prose is written for these; the template carries the rest. The park, golf
 * course or wood a stop lies in or beside does not count on its own: every path through it would
 * otherwise be told the same thing again and again. Nor does an ended postcode on its own, nor a
 * source kept out of prose (energy certificates, photographs).
 */
export function isBusier(scene: Scene): boolean {
	return scene.beats
		.map((b) => ({ ...b, facts: b.facts.filter((f) => !keptOutOfProse(f.source)) }))
		.filter((b) => b.facts.length && !isBackground(b) && !isGround(b) && !isEndedPostcode(b))
		.some(
			(b) =>
				b.effects.some((e) => TELLING.has(e)) ||
				b.facts.some(
					(f) => isElsewhere(f) || isHistory(f) || (f.claim.key === 'name' && !isElsewhere(f))
				)
		);
}
