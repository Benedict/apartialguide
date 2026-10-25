/** A position as [latitude, longitude] in degrees. */
export type LatLon = readonly [number, number];

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distance(a: LatLon, b: LatLon): number {
	const dLat = rad(b[0] - a[0]);
	const dLon = rad(b[1] - a[1]);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, in degrees clockwise from north, 0 to 360. */
export function bearing(a: LatLon, b: LatLon): number {
	const φ1 = rad(a[0]);
	const φ2 = rad(b[0]);
	const Δλ = rad(b[1] - a[1]);
	const y = Math.sin(Δλ) * Math.cos(φ2);
	const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
	return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** The point reached by travelling `metres` from `from` on `bearingDeg`. */
export function destination(from: LatLon, bearingDeg: number, metres: number): LatLon {
	const δ = metres / EARTH_RADIUS_M;
	const θ = rad(bearingDeg);
	const φ1 = rad(from[0]);
	const λ1 = rad(from[1]);
	const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
	const λ2 =
		λ1 +
		Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
	return [deg(φ2), deg(λ2)];
}

const POINTS_8 = [
	'north',
	'north-east',
	'east',
	'south-east',
	'south',
	'south-west',
	'west',
	'north-west'
];
const POINTS_16 = [
	'north',
	'north-north-east',
	'north-east',
	'east-north-east',
	'east',
	'east-south-east',
	'south-east',
	'south-south-east',
	'south',
	'south-south-west',
	'south-west',
	'west-south-west',
	'west',
	'west-north-west',
	'north-west',
	'north-north-west'
];

/** The nearest compass point to a bearing. */
export function compassLabel(bearingDeg: number, points: 8 | 16 = 8): string {
	const names = points === 8 ? POINTS_8 : POINTS_16;
	const sector = 360 / names.length;
	return names[Math.floor((((bearingDeg % 360) + 360 + sector / 2) % 360) / sector)];
}

export function polylineLength(line: readonly LatLon[]): number {
	let total = 0;
	for (let i = 1; i < line.length; i++) total += distance(line[i - 1], line[i]);
	return total;
}

/** The point `metres` along a polyline, clamped to its ends. */
export function pointAlong(line: readonly LatLon[], metres: number): LatLon {
	let remaining = Math.max(0, metres);
	for (let i = 1; i < line.length; i++) {
		const step = distance(line[i - 1], line[i]);
		if (remaining <= step && step > 0) {
			const t = remaining / step;
			return [
				line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t,
				line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t
			];
		}
		remaining -= step;
	}
	return line[line.length - 1];
}

/**
 * The nearest point of a polyline to `p`, and its distance in metres.
 * Uses a local flat projection, which is accurate at street scale.
 */
export function nearestOnPolyline(
	p: LatLon,
	line: readonly LatLon[]
): { point: LatLon; metres: number } {
	if (line.length === 1) return { point: line[0], metres: distance(p, line[0]) };
	const toXY = flatProjection(p);
	let best = { point: line[0], metres: Infinity };
	for (let i = 1; i < line.length; i++) {
		const [ax, ay] = toXY(line[i - 1]);
		const [bx, by] = toXY(line[i]);
		const dx = bx - ax;
		const dy = by - ay;
		const len2 = dx * dx + dy * dy;
		const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
		const metres = Math.hypot(ax + t * dx, ay + t * dy);
		if (metres < best.metres) {
			const a = line[i - 1];
			const b = line[i];
			best = { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], metres };
		}
	}
	return best;
}

/** The bearing of the stretch of a line nearest `p`, in the line's own direction. */
export function headingAt(p: LatLon, line: readonly LatLon[]): number {
	let best = { metres: Infinity, heading: 0 };
	for (let i = 1; i < line.length; i++) {
		const metres = distanceToPolyline(p, [line[i - 1], line[i]]);
		if (metres < best.metres) best = { metres, heading: bearing(line[i - 1], line[i]) };
	}
	return best.heading;
}

export const distanceToPolyline = (p: LatLon, line: readonly LatLon[]) =>
	nearestOnPolyline(p, line).metres;

/** Whether `p` lies inside a closed ring, by ray casting. */
export function insideRing(p: LatLon, ring: readonly LatLon[]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [yi, xi] = ring[i];
		const [yj, xj] = ring[j];
		if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi)
			inside = !inside;
	}
	return inside;
}

/** Equirectangular projection to metres around an origin. */
export function flatProjection(origin: LatLon): (p: LatLon) => [number, number] {
	const k = Math.cos(rad(origin[0]));
	return (p) => [
		rad(p[1] - origin[1]) * k * EARTH_RADIUS_M,
		rad(p[0] - origin[0]) * EARTH_RADIUS_M
	];
}

type XY = readonly [number, number];

/** Whether segment ab properly crosses segment cd. Touching at an end does not count. */
export function segmentsIntersect(a: XY, b: XY, c: XY, d: XY): boolean {
	const cross = (o: XY, p: XY, q: XY) =>
		(p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
	const d1 = cross(c, d, a);
	const d2 = cross(c, d, b);
	const d3 = cross(a, b, c);
	const d4 = cross(a, b, d);
	return d1 * d2 < 0 && d3 * d4 < 0;
}

/** The box reaching `metres` out from `centre` on every side, as [minLon, minLat, maxLon, maxLat]. */
export function bboxAround(centre: LatLon, metres: number): [number, number, number, number] {
	const north = destination(centre, 0, metres)[0];
	const south = destination(centre, 180, metres)[0];
	const east = destination(centre, 90, metres)[1];
	const west = destination(centre, 270, metres)[1];
	return [west, south, east, north];
}
