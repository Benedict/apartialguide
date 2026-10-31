import { areaSlug } from '../release';
import type { AdventureWorld } from './world';

/**
 * The walk a link begins, from the page's address: `#shirley`, an area by its slug, or `#at=…`, a
 * place by its name on the map, as a shared link gives it. Anything else, the page's own views among
 * it, is left to the page.
 */
export function entryFrom(
	hash: string,
	doors: NonNullable<AdventureWorld['doors']>
): string | undefined {
	const at = hash.match(/^#at=(.+)$/);
	if (at) return `start at ${decodeURIComponent(at[1])}`;
	const slug = hash.replace(/^#/, '');
	const door = slug ? doors.find((d) => areaSlug(d.name) === slug) : undefined;
	return door ? `start in ${door.name}` : undefined;
}
