import type { AreaRecord } from '../../core/areas';
import type { LatLon } from '../../core/geo';
import { monthYear } from '../../core/render/words';

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
	nameOf: (props: Record<string, unknown>) => string | undefined
): AreaRecord[] {
	return features.flatMap((f, i) => {
		const name = nameOf(f.properties ?? {});
		const rings = outerRings(f.geometry);
		if (!name || !rings.length) return [];
		return [{ id: String(f.id ?? i), name, kind, rings }];
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
