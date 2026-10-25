import { describe, expect, it } from 'vitest';
import { Adventure, INTRO } from './engine';
import type { AdventureWorld } from './world';

const room = (title: string, exits: AdventureWorld['stops'][string]['exits']) => ({
	title,
	paragraphs: [`You are standing on ${title}.`],
	exits,
	things: []
});

const world: AdventureWorld = {
	start: 'a',
	stops: {
		a: room('Mill Parade', [
			{ label: 'north-east', to: 'b', street: 'Cross Row' },
			{ label: 'north-east (Weir Steps)', to: 'c', street: 'Weir Steps' },
			{ label: 'west', to: 'd', street: 'Mill Parade' }
		]),
		b: room('Cross Row', []),
		c: room('Weir Steps', []),
		d: room('Mill Parade west', [])
	}
};

describe('Adventure', () => {
	describe('beginning', () => {
		const placed: AdventureWorld = {
			...world,
			positions: {
				a: [51.38, -0.07],
				b: [51.381, -0.069],
				c: [51.381, -0.071],
				d: [51.38, -0.072]
			},
			places: [{ name: 'Cross Row', kind: 'street', at: 'b' }]
		};
		const begun = () => {
			const game = new Adventure(placed);
			game.begin();
			return game;
		};

		it('opens with Guide introducing themselves, then asks where to begin', () => {
			const [intro, question] = new Adventure(placed).begin();
			expect(intro.lines[0]).toBe(INTRO[0]);
			expect(intro.title).toBeUndefined();
			expect(question.lines.join(' ')).toContain('Where would you like to begin?');
		});

		it('dates the map Guide carries, when it has a date', () => {
			const [intro] = new Adventure({ ...placed, asOf: '2026-10-24' }).begin();
			expect(intro.lines.join(' ')).toContain('24 October 2026');
		});

		it('begins at a place the reader names', () => {
			const game = begun();
			expect(game.respond('cross row').title).toBe('Cross Row');
			expect(game.here).toBe('b');
		});

		it('begins near a postcode it lacks, and says it has only its neighbours', () => {
			const game = new Adventure({
				...placed,
				places: [{ name: 'ZZ1 1AB', kind: 'postcode', at: 'c' }]
			});
			game.begin();
			const reply = game.respond('zz1 1xy');
			expect(reply.title).toBe('Weir Steps');
			expect(reply.lines[0]).toBe('I have no record of ZZ1 1XY. Only of its neighbours, ZZ1 1.');
		});

		it('asks which, when the name could be several places', () => {
			const game = new Adventure({
				...placed,
				places: [
					{ name: 'Cross Row', kind: 'street', at: 'b' },
					{ name: 'Cross Keys', kind: 'place', at: 'c' }
				]
			});
			game.begin();
			expect(game.respond('cross').lines[0]).toBe('Which: Cross Keys or Cross Row?');
		});

		it('says so when it has no record of a place', () => {
			const game = begun();
			expect(game.respond('Atlantis').lines[0]).toContain('I have no record of “Atlantis”.');
			expect(game.here).toBe('a');
		});

		it('asks the browser where the reader is', () => {
			expect(begun().respond('current location').locate).toBe(true);
			expect(begun().respond('here').locate).toBe(true);
		});

		it('begins at the stop nearest the reader', () => {
			const game = begun();
			expect(game.startAt(51.3809, -0.0711).title).toBe('Weir Steps');
		});

		it('will not begin somewhere far off the map', () => {
			const game = begun();
			expect(game.startAt(52, 0).lines[0]).toContain('That is not on my map.');
			expect(game.respond('cross row').title).toBe('Cross Row');
		});

		it('begins where Guide chooses, if the reader leaves it to them', () => {
			expect(begun().respond('anywhere').title).toBe('Mill Parade');
		});

		it('plays as usual once begun', () => {
			const game = begun();
			game.respond('cross row');
			expect(game.respond('look').title).toBe('Cross Row');
			expect(game.respond('here').locate).toBeUndefined();
		});
	});

	it('asks which way when a direction fits two exits', () => {
		const game = new Adventure({
			...world,
			stops: {
				...world.stops,
				a: room('X', [
					{ label: 'north-east (Cross Row)', to: 'b', street: 'Cross Row' },
					{ label: 'north-east (Weir Steps)', to: 'c', street: 'Weir Steps' }
				])
			}
		});
		expect(game.respond('ne').lines[0]).toBe(
			'Which way: north-east (Cross Row) or north-east (Weir Steps)?'
		);
	});

	it('prefers the exit labelled exactly', () => {
		const game = new Adventure(world);
		expect(game.respond('ne').title).toBe('Cross Row');
	});

	it('walks by street name', () => {
		const game = new Adventure(world);
		expect(game.respond('go to weir steps').title).toBe('Weir Steps');
	});

	it('says when a named way is not here', () => {
		expect(new Adventure(world).respond('go to the moon').lines[0]).toBe(
			'There’s no way to moon from here.'
		);
	});

	it('answers words it does not know', () => {
		expect(new Adventure(world).respond('dance').lines[0]).toMatch(/I don’t know how to “dance”/);
	});

	it('cannot go back before moving', () => {
		expect(new Adventure(world).respond('back').lines[0]).toBe(
			'You haven’t come from anywhere yet.'
		);
	});

	describe('hidden things', () => {
		const bench = { id: 'node/1', name: 'bench', aliases: ['bench'], description: 'A bench.' };
		const hiddenWorld: AdventureWorld = {
			start: 'a',
			stops: {
				...world.stops,
				a: {
					...world.stops.a,
					hidden: { lines: ['Looking closer, you find a bench.'], things: [bench] }
				}
			}
		};

		it('reveals them on exploring', () => {
			expect(new Adventure(hiddenWorld).respond('explore').lines).toEqual([
				'Looking closer, you find a bench.'
			]);
		});

		it('finds nothing more the second time', () => {
			const game = new Adventure(hiddenWorld);
			game.respond('explore');
			expect(game.respond('search').lines[0]).toMatch(/nothing more/);
		});

		it('finds one by name when examined', () => {
			expect(new Adventure(hiddenWorld).respond('x bench').lines).toEqual(['A bench.']);
		});

		it('says so when there is nothing hidden', () => {
			expect(new Adventure(world).respond('look around').lines[0]).toMatch(/nothing more/);
		});
	});
});
