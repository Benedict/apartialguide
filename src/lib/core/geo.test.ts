import { describe, expect, it } from 'vitest';
import {
	headingAt,
	bearing,
	compassLabel,
	destination,
	distance,
	distanceToPolyline,
	insideRing,
	bboxAround,
	pointAlong,
	polylineLength,
	type LatLon,
	segmentsIntersect
} from './geo';

describe('distance', () => {
	it('is zero for the same point', () => {
		expect(distance([51.38, -0.07], [51.38, -0.07])).toBe(0);
	});

	it('measures about 111 km per degree of latitude', () => {
		expect(distance([51, 0], [52, 0])).toBeCloseTo(111_195, -2);
	});
});

describe('bearing', () => {
	it.each([
		[[51.001, 0], 0],
		[[51, 0.001], 90],
		[[50.999, 0], 180],
		[[51, -0.001], 270]
	] as const)('points from the origin to %j at %d degrees', (to, expected) => {
		expect(bearing([51, 0], [to[0], to[1]])).toBeCloseTo(expected, 0);
	});
});

describe('destination', () => {
	it('round-trips with distance and bearing', () => {
		const to = destination([51.38, -0.07], 58, 120);
		expect(distance([51.38, -0.07], to)).toBeCloseTo(120, 3);
		expect(bearing([51.38, -0.07], to)).toBeCloseTo(58, 3);
	});
});

describe('compassLabel', () => {
	it.each([
		[0, 'north'],
		[22, 'north'],
		[23, 'north-east'],
		[58, 'north-east'],
		[90, 'east'],
		[200, 'south'],
		[293, 'north-west'],
		[350, 'north']
	])('labels %d degrees as %s on eight points', (deg, label) => {
		expect(compassLabel(deg)).toBe(label);
	});

	it('uses sixteen points when asked', () => {
		expect(compassLabel(20, 16)).toBe('north-north-east');
		expect(compassLabel(250, 16)).toBe('west-south-west');
	});
});

describe('polylines', () => {
	const line: [number, number][] = [
		[51, 0],
		[51.001, 0],
		[51.001, 0.001]
	];

	it('sums segment lengths', () => {
		expect(polylineLength(line)).toBeCloseTo(111.2 + 69.9, 0);
	});

	it('finds a point part way along', () => {
		const p = pointAlong(line, 111.195);
		expect(p[0]).toBeCloseTo(51.001, 5);
		expect(p[1]).toBeCloseTo(0, 5);
	});

	it('clamps beyond the end', () => {
		expect(pointAlong(line, 10_000)).toEqual([51.001, 0.001]);
	});

	it('measures distance from a point to the nearest segment', () => {
		expect(distanceToPolyline([51.0005, 0.0001], line)).toBeCloseTo(7, 0);
	});
});

describe('segmentsIntersect', () => {
	it('detects a crossing', () => {
		expect(segmentsIntersect([0, 0], [1, 1], [0, 1], [1, 0])).toBe(true);
	});

	it('ignores parallel segments', () => {
		expect(segmentsIntersect([0, 0], [1, 0], [0, 1], [1, 1])).toBe(false);
	});
});

describe('insideRing', () => {
	const square: [number, number][] = [
		[0, 0],
		[0, 1],
		[1, 1],
		[1, 0],
		[0, 0]
	];

	it('finds a point inside', () => {
		expect(insideRing([0.5, 0.5], square)).toBe(true);
	});

	it('rejects a point outside', () => {
		expect(insideRing([1.5, 0.5], square)).toBe(false);
	});
});

describe('bboxAround', () => {
	it('spans the radius on every side, as minLon,minLat,maxLon,maxLat', () => {
		const [minLon, minLat, maxLon, maxLat] = bboxAround([51.38, -0.07], 400);
		expect(distance([minLat, -0.07], [51.38, -0.07])).toBeCloseTo(400, 0);
		expect(distance([maxLat, -0.07], [51.38, -0.07])).toBeCloseTo(400, 0);
		expect(distance([51.38, minLon], [51.38, -0.07])).toBeCloseTo(400, 0);
		expect(distance([51.38, maxLon], [51.38, -0.07])).toBeCloseTo(400, 0);
	});
});

describe('headingAt', () => {
	it('gives the bearing of the stretch of line nearest p', () => {
		const start: LatLon = [51.38, -0.07];
		const corner = destination(start, 90, 100);
		const line = [start, corner, destination(corner, 0, 100)];
		expect(headingAt(destination(destination(start, 90, 30), 0, 5), line)).toBeCloseTo(90, 0);
		expect(headingAt(destination(corner, 0, 60), line)).toBeCloseTo(0, 0);
	});
});
