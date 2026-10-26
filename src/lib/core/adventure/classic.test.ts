import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import type { AdventureWorld, CompiledStop } from './world';
import { destination } from '../geo';

// An invented street running east, its stops 100 m apart.
const west: [number, number] = [51.38, -0.07];
const east1 = destination(west, 90, 100);
const east2 = destination(west, 90, 200);
const sextant = {
	id: 'node/1',
	name: 'The Sextant',
	aliases: ['the', 'sextant'],
	description: 'A pub, The Sextant.'
};
const stop = (title: string, at: [number, number], extra: Partial<CompiledStop>): CompiledStop => ({
	title,
	paragraphs: [`You are standing on ${title}.`, 'Exits: east, west.'],
	exits: [],
	things: [],
	at,
	...extra
});
const world: AdventureWorld = {
	start: 'a',
	stops: {
		a: stop('Long Street', west, {
			exits: [{ label: 'east', to: 'b', street: 'Long Street' }],
			things: [sextant],
			fragments: ['est Bank']
		}),
		b: stop('Long Street, further', [east1[0], east1[1]], {
			exits: [
				{ label: 'west', to: 'a', street: 'Long Street' },
				{ label: 'east', to: 'c', street: 'Long Street' }
			]
		}),
		c: stop('Blind Alley', [east2[0], east2[1]], {
			exits: [{ label: 'west', to: 'b', street: 'Long Street' }]
		})
	}
};
const touring = () => {
	const game = new Adventure(world);
	game.chance = () => 0.99;
	game.begin();
	const first = game.respond('take the tour');
	return { game, first };
};

describe('brief and verbose', () => {
	it('tells a place in full the first time, and briefly on return', () => {
		const { game, first } = touring();
		expect(first.lines).toContain('You are standing on Long Street.');
		game.respond('east');
		const back = game.respond('west');
		expect(back.title).toBe('Long Street');
		expect(back.lines).not.toContain('You are standing on Long Street.');
		expect(back.lines).toContain('You can see The Sextant here.');
		expect(back.lines.at(-1)).toBe('Exits: east, west.');
	});

	it('tells it in full again on look', () => {
		const { game } = touring();
		game.respond('east');
		game.respond('west');
		expect(game.respond('look').lines).toContain('You are standing on Long Street.');
		expect(game.respond('l').lines).toContain('You are standing on Long Street.');
	});

	it('tells every place in full in verbose mode, until brief', () => {
		const { game } = touring();
		expect(game.respond('verbose').lines[0]).toMatch(/full/);
		game.respond('east');
		expect(game.respond('west').lines).toContain('You are standing on Long Street.');
		expect(game.respond('brief').lines[0]).toMatch(/brief/i);
		game.respond('east');
		expect(game.respond('west').lines).not.toContain('You are standing on Long Street.');
	});
});

describe('classic verbs', () => {
	it('waits', () => {
		const { game } = touring();
		expect(game.respond('z').lines).toEqual(['Time passes. Not much else does.']);
		expect(game.respond('wait').lines).toEqual(['Time passes. Not much else does.']);
	});

	it('does again what was done last', () => {
		const { game } = touring();
		game.respond('east');
		expect(game.respond('g').title).toBe('Blind Alley');
		expect(game.status().moves).toBe(2);
	});

	it('says plainly when it does not know a word', () => {
		const { game } = touring();
		expect(game.respond('frob the sextant').lines).toEqual([
			'I don’t know the word “frob”. Type help to see what I understand.'
		]);
	});

	it('answers the old magic words', () => {
		const { game } = touring();
		expect(game.respond('xyzzy').lines).toEqual([
			'Nothing happens. Nothing has happened here for some time.'
		]);
	});
});

describe('status', () => {
	it('gives the place, the moves made and the distance walked', () => {
		const { game } = touring();
		expect(game.status()).toEqual({ place: 'Long Street', moves: 0, walked: 0 });
		game.respond('east');
		game.respond('east');
		const { place, moves, walked } = game.status();
		expect([place, moves]).toEqual(['Blind Alley', 2]);
		expect(walked).toBeCloseTo(200, 0);
	});
});

describe('distance walked, as the goal', () => {
	const long: AdventureWorld = {
		start: 'a',
		stops: {
			a: stop('Long Street', west, { exits: [{ label: 'east', to: 'b' }] }),
			b: stop('Far End', destination(west, 90, 300) as [number, number], {
				exits: [{ label: 'west', to: 'a' }]
			})
		}
	};

	it('marks each distance passed, once, after the place', () => {
		const game = new Adventure(long);
		game.chance = () => 0.99;
		game.begin();
		game.respond('take the tour');
		expect(game.respond('east').lines.at(-1)).toBe('You have walked 250 metres.');
		expect(game.respond('west').lines.at(-1)).toBe('You have walked 500 metres.');
		expect(game.respond('east').lines.join(' ')).not.toMatch(/You have walked/);
	});

	it('tells the score as the distance walked, and the next mark', () => {
		const game = new Adventure(long);
		game.begin();
		game.respond('take the tour');
		expect(game.respond('score').lines).toEqual([
			'You have walked 0 metres in 0 moves. The next mark is 250 metres.'
		]);
		game.respond('east');
		expect(game.respond('score').lines).toEqual([
			'You have walked 300 metres in 1 move. The next mark is 500 metres.'
		]);
	});
});

describe('carrying names', () => {
	it('takes the name of a thing here, never the thing', () => {
		const { game } = touring();
		expect(game.respond('take sextant').lines).toEqual([
			'You cannot take The Sextant. I take its name, “The Sextant”, for you.'
		]);
		expect(game.respond('i').lines).toEqual(['You are carrying “The Sextant”.']);
	});

	it('takes a broken name as found', () => {
		const { game } = touring();
		expect(game.respond('take est bank').lines).toEqual(['Taken: “est Bank”.']);
		game.respond('take sextant');
		expect(game.respond('inventory').lines).toEqual([
			'You are carrying “est Bank” and “The Sextant”.'
		]);
	});

	it('carries nothing at first, and cannot take what is not here', () => {
		const { game } = touring();
		expect(game.respond('i').lines).toEqual([
			'You are carrying nothing. Names, perhaps, if you take them.'
		]);
		expect(game.respond('take lamp').lines).toEqual(['You see no lamp here.']);
	});

	it('leaves a name where it is dropped, to be found there again', () => {
		const { game } = touring();
		game.respond('take sextant');
		game.respond('east');
		expect(game.respond('drop sextant').lines).toEqual(['You leave “The Sextant” here.']);
		expect(game.respond('i').lines[0]).toMatch(/nothing/);
		game.respond('east');
		expect(game.respond('west').lines).toContain('“The Sextant” lies here, where you left it.');
		expect(game.respond('take sextant').lines).toEqual(['Taken: “The Sextant”.']);
	});

	it('cannot drop what it does not carry', () => {
		const { game } = touring();
		expect(game.respond('drop sextant').lines).toEqual(['You are not carrying that.']);
	});
});
