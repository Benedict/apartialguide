import type { LatLon } from './geo';

/** Metres per degree of latitude, near enough for filing things in cells. */
const METRES_PER_DEGREE = 111_320;

/** South, west, north, east, in degrees. */
export type Box = [number, number, number, number];

/** The box round some points, widened by so many metres each way. */
export function boxOf(points: readonly LatLon[], metres = 0): Box {
	const lats = points.map((p) => p[0]);
	const lons = points.map((p) => p[1]);
	const dLat = metres / METRES_PER_DEGREE;
	const dLon = dLat / Math.cos((lats[0] * Math.PI) / 180);
	return [
		Math.min(...lats) - dLat,
		Math.min(...lons) - dLon,
		Math.max(...lats) + dLat,
		Math.max(...lons) + dLon
	];
}

/**
 * Things filed by cell, each under every cell its box touches, to look up only what is near.
 * Cells are about `metres` across: small for many small things, large for few that are sought from far.
 */
export class Grid<T> {
	private readonly cells = new Map<string, T[]>();
	private readonly lat: number;
	private readonly lon: number;

	constructor(metres = 55.66) {
		this.lat = metres / METRES_PER_DEGREE;
		// Cells a little wider than tall, as a degree of longitude is shorter here than one of latitude.
		this.lon = this.lat * 1.6;
	}

	private *cellsOf([s, w, n, e]: Box): Generator<string> {
		for (let i = Math.floor(s / this.lat); i <= Math.floor(n / this.lat); i++)
			for (let j = Math.floor(w / this.lon); j <= Math.floor(e / this.lon); j++) yield `${i},${j}`;
	}

	add(item: T, box: Box) {
		for (const c of this.cellsOf(box)) {
			const list = this.cells.get(c);
			if (list) list.push(item);
			else this.cells.set(c, [item]);
		}
	}

	/** Everything filed under a cell the box touches, each once. */
	near(box: Box): Set<T> {
		const found = new Set<T>();
		for (const c of this.cellsOf(box)) for (const item of this.cells.get(c) ?? []) found.add(item);
		return found;
	}
}
