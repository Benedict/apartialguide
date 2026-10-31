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

/** The box round the named wards, as `west,south,east,north`, the way records are fetched. */
export function areaBox(wards: readonly AreaRecord[], names: string[]): string {
	const points = wards.filter((w) => names.includes(w.name)).flatMap((w) => w.rings.flat());
	if (!points.length) throw new Error(`No ward boundaries for ${names.join(', ')}`);
	const lats = points.map(([lat]) => lat);
	const lons = points.map(([, lon]) => lon);
	return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
		.map((x) => +x.toFixed(6))
		.join(',');
}

/** An area's name as it goes in a file name: park-hill-whitgift. */
export const areaSlug = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
