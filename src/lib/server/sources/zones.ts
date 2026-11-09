import type { AreaRecord } from '../../core/areas';
import type { LatLon } from '../../core/geo';
import { monthYear } from '../../core/render/words';
import { said } from './box';

type Ring = number[][];
export interface ZoneFeature {
	id?: string | number;
	properties?: Record<string, unknown> | null;
	geometry?:
		| { type: 'Polygon'; coordinates: Ring[] }
		| { type: 'MultiPolygon'; coordinates: Ring[][] }
		| { type: string; coordinates: unknown }
		| null;
}

/** The outer ring of each part of a polygon, latitude first. */
function outerRings(geometry: ZoneFeature['geometry']): LatLon[][] {
	if (!geometry) return [];
	const polygons =
		geometry.type === 'Polygon'
			? [geometry.coordinates as Ring[]]
			: geometry.type === 'MultiPolygon'
				? (geometry.coordinates as Ring[][])
				: [];
	return polygons
		.map((p) => p[0])
		.filter((r) => r?.length)
		.map((r) => r.map(([lon, lat]): LatLon => [lat, lon]));
}

/** Areas drawn over the map, such as flood zones: each feature's outer rings, named as `nameOf` finds. */
export function zoneAreas(
	features: ZoneFeature[],
	kind: string,
	nameOf: (props: Record<string, unknown>) => string | undefined,
	idOf: (f: ZoneFeature, i: number) => string = (f, i) => String(f.id ?? i),
	claimsOf: (props: Record<string, unknown>) => Record<string, string> = () => ({})
): AreaRecord[] {
	return features.flatMap((f, i) => {
		const name = nameOf(f.properties ?? {});
		const rings = outerRings(f.geometry);
		if (!name || !rings.length) return [];
		const claims = claimsOf(f.properties ?? {});
		return [
			{ id: idOf(f, i), name, kind, rings, ...(Object.keys(claims).length ? { claims } : {}) }
		];
	});
}

/** The kind of area each of planning.data.gov.uk's heritage datasets draws. */
export const HERITAGE: Record<string, string> = {
	'conservation-area': 'conservation area',
	'scheduled-monument': 'scheduled monument',
	'park-and-garden': 'registered park and garden'
};

/**
 * A heritage dataset's areas, each by its name as found: a conservation area, a scheduled monument,
 * a registered park and garden with its grade. One the register has ended is left out.
 */
export function heritageAreas(features: ZoneFeature[], dataset: string): AreaRecord[] {
	const live = features.filter((f) => !f.properties?.['end-date']);
	return zoneAreas(
		live,
		HERITAGE[dataset] ?? dataset,
		(p) => (p.name ? String(p.name) : undefined),
		(f, i) => String(f.properties?.entity ?? f.id ?? i),
		(p) => said({ grade: p['park-and-garden-grade'] })
	);
}

/** Every coordinate in a geometry, however deeply its rings nest. */
function coordinatesOf(value: unknown): number[][] {
	if (!Array.isArray(value)) return [];
	if (typeof value[0] === 'number') return [value as number[]];
	return value.flatMap(coordinatesOf);
}

/** The features whose extent reaches into a box given as minLon,minLat,maxLon,maxLat. */
export function featuresInBox(features: ZoneFeature[], bbox: string): ZoneFeature[] {
	const [w, s, e, n] = bbox.split(',').map(Number);
	return features.filter((f) => {
		const points = coordinatesOf((f.geometry as { coordinates?: unknown } | null)?.coordinates);
		if (!points.length) return false;
		const lons = points.map((c) => c[0]);
		const lats = points.map((c) => c[1]);
		return (
			Math.min(...lons) <= e &&
			Math.max(...lons) >= w &&
			Math.min(...lats) <= n &&
			Math.max(...lats) >= s
		);
	});
}

/** A file's point features as the entities planning.data.gov.uk's search gives: its properties and its point. */
export function entitiesOf(features: ZoneFeature[]): Record<string, unknown>[] {
	return features.flatMap((f) => {
		if (f.geometry?.type !== 'Point') return [];
		const [lon, lat] = f.geometry.coordinates as number[];
		return [{ ...(f.properties ?? {}), point: `POINT (${lon} ${lat})` }];
	});
}

const prop = (p: Record<string, unknown>, re: RegExp) =>
	Object.entries(p).find(([k, v]) => re.test(k) && v !== null && v !== '')?.[1];

/** A flood zone as the map gives it: "Flood Zone 2" as found, a bare code as "flood zone FZ3". */
export function floodZoneName(p: Record<string, unknown>): string | undefined {
	const zone = prop(p, /^flood_?zone$/i);
	if (zone === undefined) return undefined;
	const text = String(zone);
	return /flood zone/i.test(text) ? text : `flood zone ${text}`;
}

/** A recorded flood by the month it began, as the record dates it. */
export function recordedFloodName(p: Record<string, unknown>): string | undefined {
	const start = prop(p, /^start_?date$/i);
	if (start === undefined) return undefined;
	const day = String(start).slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `the flood of ${monthYear(day)}` : undefined;
}
