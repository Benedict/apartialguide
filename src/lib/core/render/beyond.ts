import { bearing, compassLabel, distance, type LatLon } from '../geo';
import { hearsay } from './hearsay';
import { distanceWords } from './words';

/** Something another keeps that lies beyond the map: a road's line, or a site's point. */
export interface Beyond {
	name?: string;
	/** What it is: as its keeper gives it, or Guide's word with its article ("a road"). */
	kind: string;
	/** Another name it is kept under, such as a Roman one. */
	also?: string;
	points: LatLon[];
	source: string;
}

/** How far beyond the map Guide will look, in metres. */
export const BEYOND_REACH = 6000;

/** The nearest point along a line (or at a point) from here: how far, and which way. */
export function nearestOn(
	points: readonly LatLon[],
	here: LatLon
): { metres: number; bearing: number } {
	// Near enough flat over a few kilometres: metres east and north of here.
	const k = Math.cos((here[0] * Math.PI) / 180);
	const flat = ([lat, lon]: LatLon) => [
		((lon - here[1]) * k * Math.PI * 6371000) / 180,
		((lat - here[0]) * Math.PI * 6371000) / 180
	];
	const back = ([x, y]: number[]): LatLon => [
		here[0] + (y * 180) / (Math.PI * 6371000),
		here[1] + (x * 180) / (Math.PI * 6371000 * k)
	];
	let best = points[0];
	let bestD = Infinity;
	const consider = (p: LatLon) => {
		const d = distance(here, p);
		if (d < bestD) [best, bestD] = [p, d];
	};
	points.forEach(consider);
	for (let i = 1; i < points.length; i++) {
		const [ax, ay] = flat(points[i - 1]);
		const [bx, by] = flat(points[i]);
		const len = (bx - ax) ** 2 + (by - ay) ** 2;
		if (!len) continue;
		const t = Math.max(0, Math.min(1, -(ax * (bx - ax) + ay * (by - ay)) / len));
		consider(back([ax + t * (bx - ax), ay + t * (by - ay)]));
	}
	return { metres: bestD, bearing: bearing(here, best) };
}

const called = (b: Beyond) =>
	[b.name && `“${b.name}”`, b.also && `called “${b.also}”`, b.kind].filter(Boolean).join(', ');

/** What lies beyond the map within reach of here, nearest first, three at most, as hearsay. */
export function beyondLine(
	features: readonly Beyond[],
	here: LatLon,
	reach = BEYOND_REACH
): string | undefined {
	const near = features
		.map((f) => ({ f, ...nearestOn(f.points, here) }))
		.filter((n) => n.metres <= reach)
		.sort((a, b) => a.metres - b.metres)
		// A road kept in many lengths is told once, by its nearest.
		.filter((n, i, all) => all.findIndex((m) => called(m.f) === called(n.f)) === i)
		.slice(0, 3)
		.map((n) => `${called(n.f)}, ${distanceWords(n.metres)} to the ${compassLabel(n.bearing)}`);
	if (!near.length) return undefined;
	const told = near.length < 2 ? near[0] : `${near.slice(0, -1).join('; ')}; and ${near.at(-1)}`;
	return hearsay(`beyond what the map shows, ${told}`);
}
