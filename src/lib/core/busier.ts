import type { Scene } from './scene';
import { isBackground } from './slippage';
import { isElsewhere, isHistory } from './tensions';

/** Tensions in a thing's telling that make a stop worth prose of its own. */
const TELLING = new Set(['spoken-as-found', 'self-correction', 'remembered', 'was-here']);

/**
 * Whether a stop's data has something going on: a named thing, another account, something gone or
 * renamed, a broken name. Prose is written for these; the template carries the rest.
 */
export function isBusier(scene: Scene): boolean {
	return scene.beats
		.filter((b) => !isBackground(b))
		.some(
			(b) =>
				b.effects.some((e) => TELLING.has(e)) ||
				b.facts.some(
					(f) => isElsewhere(f) || isHistory(f) || (f.claim.key === 'name' && !isElsewhere(f))
				)
		);
}
