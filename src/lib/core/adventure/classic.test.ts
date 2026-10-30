import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import { MemoryHints, type HintKeeper } from './hints';
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

describe('prose that would say again what was just said', () => {
	// Two invented corners 10 m apart, each with prose written ahead of time telling the same pub.
	const prose = (text: string) => [{ kind: 'prose' as const, text, key: text }];
	const exits = (text: string) => [{ kind: 'exits' as const, text, key: text }];
	const pub = (text: string) => ({ kind: 'thing' as const, text, key: 'node/1' });
	const corner = (
		title: string,
		said: string,
		plain: CompiledStop['parts'],
		way: CompiledStop['exits']
	): CompiledStop => ({
		title,
		paragraphs: [said, 'Exits: on.'],
		parts: [prose(said), exits('Exits: on.')],
		plain: { paragraphs: plain!.map((r) => r.map((p) => p.text).join(' ')), parts: plain },
		exits: way,
		things: [sextant],
		at: west
	});
	const twice: AdventureWorld = {
		start: 'a',
		stops: {
			a: corner(
				'Long Street',
				'Long Street, and The Sextant beside you.',
				[[pub('A pub, The Sextant.')], exits('Exits: east.')],
				[{ label: 'east', to: 'b' }]
			),
			b: corner(
				'Long Street and Short Row',
				'Short Row comes down here; The Sextant a few steps west.',
				[
					[
						{ kind: 'where', text: 'You are standing where Short Row meets Long Street.', key: 'w' }
					],
					[pub('A pub, The Sextant.'), { kind: 'thing', text: 'A post box.', key: 'node/2' }],
					exits('Exits: west.')
				],
				[{ label: 'west', to: 'a' }]
			)
		}
	};
	const walk = () => {
		const game = new Adventure(twice);
		game.chance = () => 0.99;
		game.begin();
		return { game, first: game.respond('take the tour') };
	};

	it('tells the prose where nothing in it was just heard', () => {
		expect(walk().first.lines[0]).toBe('Long Street, and The Sextant beside you.');
	});

	it('tells the place plainly instead, leaving out what was just heard, when the prose would repeat it', () => {
		const { game } = walk();
		const next = game.respond('east').lines.join(' ');
		expect(next).not.toContain('Short Row comes down here');
		expect(next).not.toContain('The Sextant');
		expect(next).toContain('Short Row meets Long Street');
		expect(next).toContain('A post box.');
	});
});

describe('names Guide carries, once they have come back', () => {
	// The invented street: "est Bank" is spoken at its west end, and comes back four moves on.
	const recalling = (asked = true) => {
		const game = new Adventure(world);
		game.chance = () => 0;
		game.begin();
		game.respond('take the tour');
		const marked = asked ? game.respond('remember est bank') : undefined;
		for (const way of ['east', 'east', 'west']) game.respond(way);
		return { game, marked, back: game.respond('east') };
	};

	it('marks a name down only when asked', () => {
		expect(recalling().marked?.lines).toEqual(['I mark it down: “est Bank”.']);
	});

	it('carries nothing unasked: a broken name spoken, but not marked down, never comes back', () => {
		const { game, back } = recalling(false);
		expect(back.lines.join(' ')).not.toContain('est Bank');
		expect(game.respond('i').lines).toEqual([
			'You are carrying nothing. Names, perhaps, if you take them.'
		]);
	});

	it('says in the inventory what Guide is still carrying, once it has come back', () => {
		const { game, back } = recalling();
		expect(back.lines.join(' ')).toContain('“est Bank”');
		expect(game.respond('i').lines).toEqual(['You are carrying “est Bank”.']);
	});

	it('lets the reader examine what Guide carries, and says only that it is a name as found', () => {
		const { game } = recalling();
		expect(game.respond('examine est bank').lines).toEqual(['A name, as I found it.']);
	});

	it('says nothing of it before it has come back', () => {
		const game = new Adventure(world);
		game.chance = () => 0.99;
		game.begin();
		game.respond('take the tour');
		game.respond('east');
		expect(game.respond('i').lines).toEqual([
			'You are carrying nothing. Names, perhaps, if you take them.'
		]);
		expect(game.respond('examine est bank').lines).toEqual(['You see no est bank here.']);
	});
});

describe('drift', () => {
	// An invented crossroads: east is plain, north holds a broken name, west is where the reader came from.
	const crossroads = (): AdventureWorld => ({
		start: 'came',
		stops: {
			here: stop('Long Street and Short Row', west, {
				exits: [
					{ label: 'east', to: 'plain', street: 'Long Street' },
					{ label: 'north', to: 'odd', street: 'Short Row' },
					{ label: 'west', to: 'came', street: 'Long Street' }
				]
			}),
			plain: stop('Long Street', [east1[0], east1[1]], { exits: [{ label: 'west', to: 'here' }] }),
			odd: stop('Short Row', [east2[0], east2[1]], {
				exits: [{ label: 'south', to: 'here' }],
				fragments: ['ld Invented Mill']
			}),
			came: stop('Long Street, west', west, {
				exits: [{ label: 'east', to: 'here', street: 'Long Street' }]
			})
		}
	});
	const from = (chance: number) => {
		const game = new Adventure(crossroads());
		game.chance = () => chance;
		game.begin();
		game.respond('take the tour');
		game.respond('east');
		return game;
	};

	it('takes a way of its own, saying only which', () => {
		const reply = from(0).respond('drift');
		expect(reply.lines[0]).toMatch(/^You drift (east|north)\.$/);
		expect(reply.title).toBeDefined();
	});

	it('leans towards what is odd in the data, never doubling back while there is another way', () => {
		const ways = Array.from({ length: 20 }, (_, i) => {
			const game = from((i + 0.5) / 20);
			game.respond('drift');
			return game.status().place;
		});
		const odd = ways.filter((p) => p === 'Short Row').length;
		const plain = ways.filter((p) => p === 'Long Street').length;
		expect(odd).toBeGreaterThan(plain);
		expect(ways).not.toContain('Long Street, west');
	});

	it('counts as a step taken', () => {
		const game = from(0);
		const before = game.status();
		game.respond('drift');
		expect(game.status().moves).toBe(before.moves + 1);
	});
});

describe('hints', () => {
	const walking = (keeper: HintKeeper = new MemoryHints()) => {
		const game = new Adventure(world);
		game.chance = () => 0.99;
		game.hintKeeper = keeper;
		game.begin();
		game.respond('take the tour');
		return game;
	};
	/** Steps back and forth along the invented street, each step's hint, if any. */
	const pace = (game: Adventure, steps: number) =>
		Array.from({ length: steps }, (_, i) => game.respond(i % 2 ? 'west' : 'east').hint);

	it('gives a hint after the first step, apart from what Guide says', () => {
		const [first] = pace(walking(), 1);
		expect(first).toBe('Hint: type gps to see this place on a map.');
	});

	it('hints at nothing the reader has used already', () => {
		const game = walking();
		game.respond('gps');
		expect(pace(game, 1)[0]).toBe('Hint: type drift to let the walk choose the way.');
	});

	it('hints now and then, never the same twice', () => {
		const hints = pace(walking(), 17).filter(Boolean);
		expect(hints).toHaveLength(3);
		expect(new Set(hints).size).toBe(3);
	});

	it('remembers across walks what it has hinted and what the reader has used', () => {
		const keeper = new MemoryHints();
		const first = walking(keeper);
		pace(first, 1);
		first.respond('drift');
		expect(pace(walking(keeper), 1)[0]).toBe(
			'Hint: type route to, then a street or a place, for the way there.'
		);
	});

	it('gives none of its own once every hint has been given, on any walk', () => {
		const keeper = new MemoryHints();
		pace(walking(keeper), 200);
		expect(pace(walking(keeper), 40).filter(Boolean)).toEqual([]);
	});

	it('gives a hint whenever asked, even once all are given or hints are off', () => {
		const keeper = new MemoryHints();
		pace(walking(keeper), 200);
		const game = walking(keeper);
		game.respond('hints off');
		const asked = [game.respond('hint').hint, game.respond('hint').hint];
		expect(asked[0]).toMatch(/^Hint: /);
		expect(asked[1]).toMatch(/^Hint: /);
		expect(asked[0]).not.toBe(asked[1]);
	});

	it('stops with hints off, on this walk and the next, and starts again with hints on', () => {
		const keeper = new MemoryHints();
		const game = walking(keeper);
		expect(game.respond('hints off').lines).toEqual(['Hints off.']);
		expect(pace(game, 9).filter(Boolean)).toEqual([]);
		expect(pace(walking(keeper), 9).filter(Boolean)).toEqual([]);
		expect(game.respond('hints on').lines).toEqual(['Hints on.']);
		expect(pace(game, 1)[0]).toMatch(/^Hint: /);
	});
});
