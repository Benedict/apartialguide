import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import { Adventure } from './engine';
import { planRoute, routeIndex, routeWords } from './route';
import { MemorySaves } from './saves';
import type { AdventureWorld, CompiledStop } from './world';

// An invented corner of nowhere: Long Street runs east, Short Row north from its west end,
// Blind Alley south from its east end, and Lost Lane Hall stands apart, reached by no street.
const O: [number, number] = [51.38, -0.07];
const at = (bearing: number, metres: number, from = O): [number, number] => {
	const [lat, lon] = destination(from, bearing, metres);
	return [lat, lon];
};
const stop = (
	title: string,
	where: [number, number],
	exits: CompiledStop['exits'],
	things: string[] = []
): CompiledStop => ({
	title,
	paragraphs: [],
	exits,
	things: things.map((name, i) => ({
		id: `node/${i}`,
		name,
		aliases: name === 'The Sextant' ? ['sextant', 'pub'] : [],
		description: ''
	})),
	at: where
});
const world: AdventureWorld = {
	start: 'a',
	stops: {
		a: stop('Long Street and Short Row', O, [
			{ label: 'east', to: 'b', street: 'Long Street' },
			{ label: 'north', to: 'd', street: 'Short Row' }
		]),
		b: stop('Long Street', at(90, 100), [
			{ label: 'west', to: 'a', street: 'Long Street' },
			{ label: 'east', to: 'c', street: 'Long Street' }
		]),
		c: stop(
			'Long Street and Blind Alley',
			at(90, 200),
			[
				{ label: 'west', to: 'b', street: 'Long Street' },
				{ label: 'south', to: 'e', street: 'Blind Alley' }
			],
			['The Sextant', 'bicycle parking']
		),
		d: stop('Short Row', at(0, 80), [{ label: 'south', to: 'a', street: 'Short Row' }]),
		e: stop('Blind Alley', at(180, 60, at(90, 200)), [
			{ label: 'north', to: 'c', street: 'Blind Alley' }
		]),
		f: stop('Lost Lane Hall', at(270, 500), [], ['Lost Lane Hall'])
	}
};
const index = routeIndex(world);

describe('routeIndex', () => {
	it('knows each stop by its streets and its named things, not by things without a name', () => {
		expect(index.names['the sextant']).toEqual(['c']);
		expect(index.names['long street'].sort()).toEqual(['a', 'b', 'c']);
		expect(index.names['bicycle parking']).toBeUndefined();
	});
});

describe('planRoute', () => {
	it('finds the way to a named thing along the streets, as legs of one street each', () => {
		const plan = planRoute(index, 'd', 'sextant');
		expect(plan.kind).toBe('way');
		if (plan.kind !== 'way') return;
		expect(plan.to).toBe('The Sextant');
		expect(plan.path).toEqual(['d', 'a', 'b', 'c']);
		expect(plan.legs.map((l) => [l.label, l.street, Math.round(l.metres)])).toEqual([
			['south', 'Short Row', 80],
			['east', 'Long Street', 200]
		]);
	});

	it('finds a thing by the words a reader might use for it, its kind among them', () => {
		const plan = planRoute(index, 'a', 'sextant pub');
		expect(plan.kind === 'way' && plan.to).toBe('The Sextant');
		expect(planRoute(index, 'a', 'nowhere street')).toEqual({ kind: 'unknown' });
		// The small words of a question are not part of any name.
		const pub = planRoute(index, 'a', 'a pub');
		expect(pub.kind === 'way' && pub.to).toBe('The Sextant');
	});

	it('takes the nearest stop of a street', () => {
		const plan = planRoute(index, 'a', 'blind alley');
		expect(plan.kind === 'way' && plan.path).toEqual(['a', 'b', 'c']);
	});

	it('says when the reader is there already, when it knows no such place, and when no street leads there', () => {
		expect(planRoute(index, 'b', 'long street')).toEqual({ kind: 'here', to: 'Long Street' });
		expect(planRoute(index, 'a', 'nowhere at all')).toEqual({ kind: 'unknown' });
		expect(planRoute(index, 'a', 'lost lane hall')).toEqual({
			kind: 'unreachable',
			to: 'Lost Lane Hall'
		});
	});
});

describe('routeWords', () => {
	it('gives the way leg by leg, with how far, and how far in all', () => {
		expect(routeWords(planRoute(index, 'd', 'the sextant'))).toBe(
			'To “The Sextant”: south along Short Row, 80 metres; then east along Long Street, 200 metres. About 280 metres in all.'
		);
	});
});

describe('the way, in the walk', () => {
	const walking = (from = 'd') => {
		const game = new Adventure({ ...world, start: from });
		game.chance = () => 0.99;
		game.begin();
		game.respond('take the tour');
		return game;
	};
	const said = (r: { lines: string[] }) => r.lines.join(' ');

	it('gives the way when asked, and keeps it', () => {
		expect(walking().respond('route to the sextant').lines).toEqual([
			'To “The Sextant”: south along Short Row, 80 metres; then east along Long Street, 200 metres. About 280 metres in all.',
			'I will say the way at each turn.'
		]);
	});

	it('says the way on at each stop, and lets it go on arrival', () => {
		const game = walking();
		game.respond('way to sextant');
		expect(said(game.respond('south'))).toContain('Your way to “The Sextant”: east (Long Street).');
		game.respond('east');
		expect(said(game.respond('east'))).toContain('You are at “The Sextant”. That was the way.');
		expect(said(game.respond('west'))).not.toContain('Your way');
	});

	it('finds the way again from wherever the reader wanders', () => {
		const game = walking('a');
		game.respond('route to blind alley');
		expect(said(game.respond('north'))).toContain('Your way to “Blind Alley”: south (Short Row).');
	});

	it('lets the way go when asked', () => {
		const game = walking();
		game.respond('route to the sextant');
		expect(game.respond('route off').lines).toEqual(['I let the way go.']);
		expect(said(game.respond('south'))).not.toContain('Your way');
	});

	it('says when it knows no such place, no way there, or the reader is there already', () => {
		const game = walking('a');
		expect(game.respond('route to nowhere at all').lines).toEqual([
			'I know of nowhere by that name on my map.'
		]);
		expect(game.respond('route to lost lane hall').lines).toEqual([
			'I know of no way from here to “Lost Lane Hall”.'
		]);
		expect(game.respond('route to short row').lines).toEqual([
			'You are there already: “Short Row”.'
		]);
	});

	it('keeps the way through a walk saved and picked up again', () => {
		const game = walking();
		game.saves = new MemorySaves();
		game.respond('route to the sextant');
		game.respond('save 1');
		const later = new Adventure({ ...world, start: 'd' });
		later.saves = game.saves;
		later.begin();
		later.respond('restore 1');
		expect(said(later.respond('south'))).toContain(
			'Your way to “The Sextant”: east (Long Street).'
		);
	});

	it('plans from a route index it is given, when its world is only partly open', () => {
		const partial = new Adventure({
			...world,
			start: 'd',
			about: { streets: 3, places: 6, accounts: [] },
			stops: { d: world.stops.d, a: world.stops.a }
		});
		partial.begin();
		partial.respond('take the tour');
		expect(partial.needsRoutes('route to the sextant')).toBe(true);
		expect(partial.respond('route to the sextant').lines).toEqual([
			'I cannot find the way just now.'
		]);
		partial.routes = index;
		expect(partial.needsRoutes('route to the sextant')).toBe(false);
		expect(partial.respond('route to the sextant').lines[0]).toContain('To “The Sextant”');
	});
});
