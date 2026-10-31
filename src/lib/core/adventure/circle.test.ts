import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import { circleThrough, walkable } from './circle';
import type { RouteIndex } from './route';

// Invented: a stop where the circle is set down, and two stops far round it, one nearest to most of
// the curve: no real place.
const here: [number, number] = [51.38, -0.07];
const centre = destination(here, 180, 250);
const index: RouteIndex = {
	stops: {
		a: { at: here, exits: [] },
		b: { at: destination(centre, 90, 250) as [number, number], exits: [] },
		c: { at: destination(centre, 200, 250) as [number, number], exits: [] },
		d: { at: destination(centre, 300, 250) as [number, number], exits: [] }
	},
	names: {},
	said: {},
	aliases: {}
};

describe('circleThrough', () => {
	it('keeps each stop once round the curve, in order, beginning where the glass was set down', () => {
		expect(circleThrough(index, 'a', 180)?.points).toEqual(['a', 'b', 'c', 'd']);
	});

	it('keeps a stop nearest two stretches of the curve only once, where it first comes', () => {
		// A stop at the centre is nearest the stretches between e and f, and between f and the start.
		const sparse: RouteIndex = {
			...index,
			stops: {
				a: { at: here, exits: [] },
				e: { at: destination(centre, 45, 250) as [number, number], exits: [] },
				f: { at: destination(centre, 190, 250) as [number, number], exits: [] },
				m: { at: centre as [number, number], exits: [] }
			}
		};
		const points = circleThrough(sparse, 'a', 180)!.points;
		expect(new Set(points).size).toBe(points.length);
		expect(points).toEqual(['a', 'e', 'm', 'f']);
	});

	it('counts the points the streets reach from the one before, near enough round the curve', () => {
		// a to b joined, b to c joined, c to d only by a long way out: two steps walkable of three.
		const far = destination(centre, 0, 5000) as [number, number];
		const joined: RouteIndex = {
			...index,
			stops: {
				a: { ...index.stops.a, exits: [['on', 'b']] },
				b: { ...index.stops.b, exits: [['on', 'c']] },
				c: { ...index.stops.c, exits: [['out', 'x']] },
				x: { at: far, exits: [['in', 'd']] },
				d: { ...index.stops.d, exits: [] }
			}
		};
		const circle = circleThrough(joined, 'a', 180)!;
		expect(circle.points).toEqual(['a', 'b', 'c', 'd']);
		expect(walkable(joined, circle)).toBe(2);
	});
});
