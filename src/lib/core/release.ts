import { areaAt, type AreaRecord } from './areas';
import type { SourceRecord } from './adapters/records';
import type { LatLon } from './geo';

/**
 * The walk is enriched area by area: an area is a name people know, made of whole wards as the
 * boundaries name them (`data/areas.json`), so what is enriched is exact though the area has no
 * outline of its own.
 */
/** An area may be marked `open`: only open areas are walked, once any is. */
export type AreaList = { name: string; wards: string[]; open?: boolean }[];

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

/** The places an area holds, as an area's fetch keeps records by them. */
export interface AreaHolds {
	inside: (p: LatLon) => boolean;
	/** Mapped addresses inside the area, as `number|street`, the street lower-cased. */
	addresses: ReadonlySet<string>;
	/** Named streets that run inside the area alone. */
	streets: ReadonlySet<string>;
}

/** An address as `AreaHolds.addresses` keeps it. */
export const addressKey = (number: string, street: string) =>
	`${number.trim()}|${street.trim().toLowerCase()}`;

/**
 * Whether an area's fetch keeps a record: placed inside the area, at an address the map has inside
 * it, or about a street that runs inside it alone. Anything else might attach to another area's
 * stops and change what is said there, so it is left for that area's own fetch.
 */
export function keptInArea(holds: AreaHolds): (record: SourceRecord) => boolean {
	return (r) =>
		r.at
			? holds.inside(r.at)
			: r.address
				? holds.addresses.has(addressKey(r.address.number, r.address.street))
				: r.street !== undefined && holds.streets.has(r.street);
}

/**
 * The area a stop's ward belongs to, where that area is not open to walk; nothing where it is open,
 * or where no area is marked open yet. A ward no area lists goes by its own name.
 */
export function closedAreaOf(areas: AreaList): (ward: string | undefined) => string | undefined {
	if (!areas.some((a) => a.open)) return () => undefined;
	return (ward) => {
		if (ward === undefined) return 'This area';
		const area = areas.find((a) => a.wards.includes(ward));
		return area?.open ? undefined : (area?.name ?? ward);
	};
}
