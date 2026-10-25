import type { LatLon } from '../../core/geo';

/** Whether a point lies in a box given as minLon,minLat,maxLon,maxLat. */
export function inBox(at: LatLon, bbox: string): boolean {
	const [w, s, e, n] = bbox.split(',').map(Number);
	return at[0] >= s && at[0] <= n && at[1] >= w && at[1] <= e;
}

/** A point from two values that may be numbers or numeric strings; nothing if either is not. */
export function point(lat: unknown, lon: unknown): LatLon | undefined {
	const a = Number(lat);
	const b = Number(lon);
	return lat !== undefined &&
		lat !== null &&
		lat !== '' &&
		Number.isFinite(a) &&
		Number.isFinite(b) &&
		lon !== '' &&
		lon !== null
		? [a, b]
		: undefined;
}

/** Only the claims that have something to say. */
export const said = (claims: Record<string, unknown>): Record<string, string> =>
	Object.fromEntries(
		Object.entries(claims)
			.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
			.map(([k, v]) => [k, String(v)])
	);
