import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import { MemorySaves } from './saves';
import type { AdventureWorld, CompiledStop } from './world';
import { destination } from '../geo';
import type { Fact } from '../facts';
import type { Omm } from '../adapters/overhead';

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

describe('looking up', () => {
	const night = new Date('2026-10-29T19:39:35Z');

	it('tells the weather and the planets at once, and asks the page after what passes overhead', () => {
		const { game } = touring();
		game.clock = () => night;
		const reply = game.respond('look up');
		expect(reply.ask).toBe('overhead');
		expect(reply.lines.join(' ')).toContain('Saturn is up in the south-east');
	});

	it('tells what passes overhead when the page has asked, and nothing without an answer', () => {
		const { game } = touring();
		game.clock = () => night;
		expect(game.overhead(undefined, undefined)).toBeUndefined();
		const plane = {
			ac: [{ hex: 'a', flight: 'INV123 ', alt_baro: 5800, track: 91, lat: 51.381, lon: -0.07 }]
		};
		expect(game.overhead([] as Omm[], plane)?.lines).toEqual([
			'Overhead, INV123 at 5,800 feet, heading east.'
		]);
	});
});

describe('using the camera', () => {
	const camera = (key: string, value: string): Fact => ({
		id: `camera/1:${key}`,
		subject: 'camera/1',
		claim: { key, value },
		source: 'TfL',
		observed: '2026-10-29T19:39:35Z',
		reach: 0,
		geometry: []
	});

	it('asks the page to find the nearest camera', () => {
		const { game } = touring();
		expect(game.respond('use the camera')).toEqual({ lines: [], ask: 'camera' });
	});

	it('shows what the nearest camera saw, from where the map puts this place', () => {
		const { game } = touring();
		const there = destination(west, 90, 450);
		const reply = game.camera([
			camera('name', 'Invented Rd/Other Rd'),
			camera('image', 'https://example.org/cam.jpg'),
			camera('latitude', String(there[0])),
			camera('longitude', String(there[1]))
		]);
		expect(reply.lines).toEqual([
			'The nearest camera is at “Invented Rd/Other Rd”, 450 metres to the east. This is what it saw.'
		]);
		expect(reply.image?.src).toBe('https://example.org/cam.jpg');
	});

	it('says nothing happens without an answer', () => {
		const { game } = touring();
		expect(game.camera(undefined).lines).toEqual(['Nothing happens.']);
	});
});

describe('looking beyond the map', () => {
	it('tells what another keeps beyond the map, from where the map puts this place', () => {
		const road = destination(west, 270, 2300);
		const game = new Adventure({
			...world,
			beyond: [
				{ name: 'Invented Way?', kind: 'a road', points: [[road[0], road[1]]], source: 'Invented' }
			]
		});
		game.begin();
		game.respond('take the tour');
		const said = game.respond('look beyond').lines.join(' ');
		expect(said).toContain(
			'beyond what the map shows, “Invented Way?”, a road, 2.3 km to the west.'
		);
	});

	it('owns to not knowing, when nothing is kept near enough', () => {
		const { game } = touring();
		expect(game.respond('look beyond').lines).toEqual([
			'Beyond the map there may be more. I could not say what.'
		]);
	});
});

describe('the lighting, by the hour', () => {
	const litStop = (title: string, at: [number, number]): CompiledStop => ({
		title,
		paragraphs: [`You are standing on ${title}. Lit at night.`, 'Exits: east.'],
		parts: [
			[
				{ kind: 'where', text: `You are standing on ${title}.`, key: title, street: title },
				{ kind: 'street', text: 'Lit at night.', key: 'Lit at night.', lit: 'yes' }
			],
			[{ kind: 'exits', text: 'Exits: east.', key: 'exits' }]
		],
		exits: [{ label: 'east', to: 'b', street: title }],
		things: [],
		at
	});
	const game = (when: string) => {
		const g = new Adventure({
			start: 'a',
			stops: { a: litStop('Lamp Street', west), b: litStop('Lamp Street', west) }
		});
		g.clock = () => new Date(when);
		g.begin();
		return g;
	};

	it('says the lit street is lit and dark at midnight, and lit only at night at noon', () => {
		expect(game('2026-10-29T00:00:00Z').respond('take the tour').lines[0]).toContain(
			'Street lamps light the way.'
		);
		expect(game('2026-10-29T12:00:00Z').respond('take the tour').lines[0]).toContain(
			'There are street lamps along here, unlit by day.'
		);
	});

	it('says it for the hour when the reader looks again', () => {
		const g = game('2026-10-29T00:00:00Z');
		g.respond('take the tour');
		expect(g.respond('look').lines[0]).toContain('Street lamps light the way.');
	});
});

describe('a world opened as the walk goes', () => {
	it('says which places a command needs: here, where you came from and where the exits lead', () => {
		const { game } = touring();
		expect(game.needs('east')).toEqual(['a', 'b']);
		game.respond('east');
		expect(game.needs('look')).toEqual(['b', 'a', 'c']);
	});

	it('needs the place a walk was kept at, to restore it', () => {
		const { game } = touring();
		game.saves = new MemorySaves();
		game.respond('east');
		game.respond('east');
		game.respond('save 2');
		const other = new Adventure(world);
		other.saves = game.saves;
		expect(other.needs('restore 2')).toEqual(['c', 'b']);
		expect(other.needs('restore 4')).toEqual([]);
	});

	it('knows its map by the places the account counts, however few are open', () => {
		const counted = { ...world, about: { streets: 1, places: 3, accounts: [] } };
		const kept = new MemorySaves();
		const full = new Adventure(counted);
		full.saves = kept;
		full.begin();
		full.respond('take the tour');
		full.respond('save 1');
		const partial = new Adventure({ ...counted, stops: { a: world.stops.a } });
		partial.saves = kept;
		partial.begin();
		expect(partial.respond('restore 1').lines[0]).toBe('Restored from slot 1.');
	});
});
