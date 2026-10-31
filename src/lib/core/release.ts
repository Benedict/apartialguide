import { areaAt, type AreaRecord } from './areas';
import type { LatLon } from './geo';

/**
 * The walk is enriched area by area: an area is a name people know, made of whole wards as the
 * boundaries name them (`data/areas.json`), so what is enriched is exact though the area has no
 * outline of its own.
 */
export type AreaList = { name: string; wards: string[] }[];

/** The wards an area is made of; an area not on the list is refused, never taken as everywhere. */
export function areaWards(areas: AreaList, name: string): string[] {
	const area = areas.find((a) => a.name.toLowerCase() === name.trim().toLowerCase());
	if (!area) throw new Error(`No area called ${name}: ${areas.map((a) => a.name).join(', ')}`);
	return area.wards;
}

/** Whether a place lies in any of the named wards; a name the boundaries lack is refused. */
export function inArea(wards: readonly AreaRecord[], names: string[]): (p: LatLon) => boolean {
	const missing = names.filter((n) => !wards.some((w) => w.name === n));
	if (missing.length) throw new Error(`No ward boundaries for ${missing.join(', ')}`);
	const these = wards.filter((w) => names.includes(w.name));
	return (p) => areaAt(p, these) !== undefined;
}
