import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
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
