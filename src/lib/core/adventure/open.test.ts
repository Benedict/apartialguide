import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import { closeAreas, doorsFor } from './open';
import { routeIndex } from './route';
import type { AdventureWorld, CompiledStop } from './world';

// An invented street running from an open area into one not yet open: no real place.
const stop = (title: string, lon: number, exits: CompiledStop['exits']): CompiledStop => ({
	title,
	paragraphs: [`You are standing on ${title}.`],
	exits,
	things: [],
	at: [51.38, lon]
});
const world: AdventureWorld = {
	start: 'a',
	asOf: '2026-10-29',
	about: { streets: 9, places: 3, accounts: [], areas: { kind: 'ward', count: 2, most: [] } },
	stops: {
		a: {
			...stop('Long Street', 0, [{ label: 'east', to: 'b', street: 'Long Street' }]),
			area: { name: 'Inventa West', kind: 'ward' }
		},
		b: {
			...stop('Long Street and Short Row', 0.001, [
				{ label: 'west', to: 'a', street: 'Long Street' },
				{ label: 'east', to: 'c', street: 'Short Row' }
			]),
			area: { name: 'Inventa West', kind: 'ward' }
		},
		c: {
			...stop('Short Row', 0.002, [{ label: 'west', to: 'b', street: 'Short Row' }]),
			area: { name: 'Elsewhere', kind: 'ward' }
		}
	}
};
const open = closeAreas(world, (id) => (id === 'c' ? 'Elsewhere' : undefined));

describe('closeAreas: only the areas open to walk', () => {
	it('keeps the open stops, and marks an exit into a closed area with its name', () => {
		expect(Object.keys(open.stops)).toEqual(['a', 'b']);
		expect(open.stops.b.exits).toEqual([
			{ label: 'west', to: 'a', street: 'Long Street' },
			{ label: 'east', to: 'c', street: 'Short Row', closed: 'Elsewhere' }
		]);
	});

	it('counts what Guide carries again from what is open', () => {
		expect(open.about).toMatchObject({
			places: 2,
			streets: 1,
			areas: { kind: 'ward', count: 1, most: ['Inventa West'] }
		});
	});

	it('marks a way into a closed stop the world was compiled without', () => {
		const without = Object.fromEntries(Object.entries(world.stops).filter(([id]) => id !== 'c'));
		const fewer = closeAreas({ ...world, stops: without }, (id) =>
			id === 'c' ? 'Elsewhere' : undefined
		);
		expect(fewer.stops.b.exits.at(-1)).toMatchObject({ to: 'c', closed: 'Elsewhere' });
	});

	it('refuses a world whose start lies in a closed area', () => {
		expect(() =>
			closeAreas({ ...world, start: 'c' }, (id) => (id === 'c' ? 'Elsewhere' : undefined))
		).toThrow(/start/);
	});

	it('plans no way through a closed area', () => {
		expect(routeIndex(open).stops.b.exits.map(([, to]) => to)).toEqual(['a']);
	});
});

describe('the edge of what is open', () => {
	const game = (signup?: string) => {
		const g = new Adventure({ ...open, ...(signup ? { signup } : {}) });
		g.begin();
		g.respond('take the tour');
		g.respond('east');
		return g;
	};

	it('stops the walk, and the page names the area not yet open', () => {
		const g = game();
		const reply = g.respond('east');
		expect(reply.lines).toEqual(['The map I carry stops there.']);
		expect(reply.hint).toBe('Elsewhere is not open yet.');
		expect(reply.link).toBeUndefined();
		expect(g.respond('look').title).toBe('Long Street and Short Row');
	});

	it('offers to tell the reader when it opens, where there is somewhere to sign up', () => {
		const reply = game('https://example.org/signup').respond('east');
		expect(reply.link).toEqual({
			href: 'https://example.org/signup',
			text: 'Hear when Elsewhere opens'
		});
	});

	it('never drifts into a closed area, nor asks for it to be opened', () => {
		const g = game();
		g.chance = () => 0.99;
		expect(g.needs('look')).not.toContain('c');
		expect(g.respond('drift').title).toBe('Long Street');
	});
});

describe('doorsFor: where each area may be begun', () => {
	const withMill: AdventureWorld = {
		...world,
		stops: {
			...world.stops,
			b: {
				...world.stops.b,
				things: [
					{ id: 'node/9', name: 'Inventa Windmill', aliases: [], description: 'A windmill.' }
				]
			}
		}
	};
	const areaOf = (ward?: string) =>
		ward === 'Inventa West' ? 'Inventa' : ward === 'Elsewhere' ? 'Elsewhere' : undefined;

	it('opens the tour’s area at the tour’s start, and names an area not open yet without a place', () => {
		expect(
			doorsFor(
				withMill,
				[
					{ name: 'Inventa', wards: ['Inventa West'], open: true },
					{ name: 'Elsewhere', wards: ['Elsewhere'] }
				],
				areaOf
			)
		).toEqual([{ name: 'Inventa', stop: 'a' }, { name: 'Elsewhere' }]);
	});

	it('opens an area at the place its start names', () => {
		expect(
			doorsFor(
				withMill,
				[{ name: 'Inventa', wards: ['Inventa West'], open: true, start: 'Inventa Windmill' }],
				areaOf
			)
		).toEqual([{ name: 'Inventa', stop: 'b' }]);
	});

	it('gives no door to an area whose start this map does not hold, and says which', () => {
		const missing: string[] = [];
		expect(
			doorsFor(
				withMill,
				[{ name: 'Inventa', wards: ['Inventa West'], open: true, start: 'Atlantis' }],
				areaOf,
				(name) => missing.push(name)
			)
		).toEqual([]);
		expect(missing).toEqual(['Inventa']);
	});
});
