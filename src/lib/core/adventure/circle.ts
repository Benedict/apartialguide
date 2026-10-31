import { destination, distance, type LatLon } from '../geo';
import type { StopId } from '../stops';
import { planRoute, type RouteIndex } from './route';

/** About the circle a glass's rim draws on a street map: 500 metres across. */
export const GLASS_RADIUS = 250;
/** A point further by the streets than this many arcs between points is passed over. */
export const FAR = 3;
/** Points round the curve the way is kept to. */
const POINTS = 12;

export interface Circle {
	centre: LatLon;
	radius: number;
	/** The stops nearest points round the curve, clockwise from where it was set down. */
	points: StopId[];
}

/**
 * A circle set down with its edge through a stop: its centre `radius` metres off on `bearing`, and
 * the stops nearest twelve points round it, clockwise from that stop, each once.
 */
export function circleThrough(
	index: RouteIndex,
	here: StopId,
	bearing: number,
	radius = GLASS_RADIUS
): Circle | undefined {
	const start = index.stops[here]?.at;
	if (!start) return undefined;
	const centre = destination(start, bearing, radius);
	const placed = Object.entries(index.stops).flatMap(([id, s]) =>
		s.at ? [[id, s.at] as [StopId, LatLon]] : []
	);
	const nearest = (p: LatLon) => {
		let best: StopId = here;
		let d = Infinity;
		for (const [id, where] of placed) {
			const m = distance(p, where);
			if (m < d) [best, d] = [id, m];
		}
		return best;
	};
	const back = (bearing + 180) % 360;
	const points: StopId[] = [here];
	for (let i = 1; i < POINTS; i++) {
		const id = nearest(destination(centre, (back + (360 / POINTS) * i) % 360, radius));
		// Each stop once, where it first comes round the curve.
		if (!points.includes(id)) points.push(id);
	}
	return points.length >= 4 ? { centre, radius, points } : undefined;
}

/** How far a stop lies from the curve, in metres. */
export const offCurve = (circle: Pick<Circle, 'centre' | 'radius'>, at: LatLon) =>
	Math.abs(distance(circle.centre, at) - circle.radius);

/** The arc between one point and the next, in metres. */
export const arcOf = (circle: Circle) => (2 * Math.PI * circle.radius) / circle.points.length;

/**
 * How well the streets go round a circle: the points they reach from the one before, the start's
 * again last, within FAR arcs.
 */
export function walkable(index: RouteIndex, circle: Circle): number {
	const limit = FAR * arcOf(circle);
	const { points } = circle;
	let count = 0;
	for (let i = 1; i < points.length; i++) {
		const plan = planRoute(index, points[i - 1], new Map([[points[i], '']]));
		if (plan.kind === 'way' && plan.metres <= limit) count++;
	}
	return count;
}
