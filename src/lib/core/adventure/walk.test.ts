import { describe, expect, it } from 'vitest';
import { freshWalk, keepWalk, pickUpWalk } from './walk';
import type { WalkState } from './saves';

// An invented walk with something in every part of it: no real place.
const kept: WalkState = {
	here: 'b',
	previous: 'a',
	moves: 3,
	walked: 420,
	verbose: true,
	following: true,
	route: { to: 'The Inventa Arms', goals: [['c', 'The Inventa Arms']] },
	circle: {
		centre: [51.38, -0.07],
		radius: 250,
		points: ['a', 'b', 'c'],
		next: 2,
		record: ['Long Street: The Inventa Arms.'],
		seen: ['a'],
		strayed: 12
	},
	lastCommand: 'go east',
	lastStreet: 'Long Street',
	visited: ['a', 'b'],
	explored: ['a'],
	pocket: ['est Bank'],
	left: [['a', ['Havelock Hall']]],
	carried: [['Inventa Row', { at: 'a', move: 1 }]],
	recalled: ['Inventa Row'],
	heard: [['thing:node/1'], ['thing:node/2']],
	framed: [['dense', 'There is a great deal here.']],
	met: [['havelock', [{ said: 'Havelock Hall', at: 'a', move: 1 }]]],
	connected: ['havelock']
};

describe('a walk, kept and picked up', () => {
	it('keeps every part of a walk, and picks it up the same', () => {
		expect(keepWalk(pickUpWalk(kept))).toEqual(kept);
	});

	it('begins a fresh walk where it is told, with nothing yet', () => {
		expect(keepWalk(freshWalk('a'))).toEqual({
			here: 'a',
			moves: 0,
			walked: 0,
			verbose: false,
			visited: [],
			explored: [],
			pocket: [],
			left: [],
			carried: [],
			recalled: [],
			heard: [],
			framed: [],
			met: [],
			connected: []
		});
	});

	it('keeps a walk apart from the walk going on', () => {
		const walk = pickUpWalk(kept);
		const saved = keepWalk(walk);
		walk.visited.add('c');
		walk.pocket.push('Inventa Row');
		walk.circle!.record.push('Short Row: nothing new.');
		walk.heard.push(['thing:node/3']);
		walk.met.get('havelock')!.push({ said: 'Havelock Road', at: 'c', move: 3 });
		expect(saved).toEqual(kept);
		const again = pickUpWalk(saved);
		walk.circle!.points.push('d');
		expect(again.circle?.points).toEqual(['a', 'b', 'c']);
	});

	it('picks up a walk kept before some parts were kept, without them', () => {
		const older = { ...kept };
		delete older.following;
		delete older.circle;
		delete older.route;
		const walk = pickUpWalk(older);
		expect(walk.following).toBe(false);
		expect(walk.circle).toBeUndefined();
		expect(walk.route).toBeUndefined();
	});
});
