import type { AreaRecord } from '../../core/areas';
import type { LatLon } from '../../core/geo';

type Ring = [number, number][];
interface WardFeature {
	properties?: Record<string, unknown>;
	geometry?:
		| { type: 'Polygon'; coordinates: Ring[] }
		| { type: 'MultiPolygon'; coordinates: Ring[][] }
		| null;
}

/** The field ending in CD or NM for whichever year's boundaries these are, such as WD24NM. */
const field = (props: Record<string, unknown>, suffix: string) =>
	Object.entries(props).find(([k]) => new RegExp(`^WD\\d{2}${suffix}$`).test(k))?.[1];

/** Wards from the ONS Open Geography Portal, as GeoJSON: names as found, outer rings only. */
export function wardAreas(answer: { features?: WardFeature[] }): AreaRecord[] {
	return (answer.features ?? []).flatMap((f) => {
		const props = f.properties ?? {};
		const name = field(props, 'NM');
		const g = f.geometry;
		if (typeof name !== 'string' || !g) return [];
		const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
		const rings = polygons
			.map((p) => p[0])
			.filter((r) => r?.length)
			.map((r) => r.map(([lon, lat]): LatLon => [lat, lon]));
		if (!rings.length) return [];
		return [{ id: String(field(props, 'CD') ?? name), name, kind: 'ward', rings }];
	});
}
