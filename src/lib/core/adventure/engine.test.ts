import { describe, expect, it } from 'vitest';
import { Adventure, INTRO } from './engine';
import type { AdventureWorld } from './world';
import { currentWeatherFacts } from '../adapters/weather';

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
		const begun = () => {
			const game = new Adventure(world);
			game.begin();
			return game;
		};

		it('opens with Guide introducing themselves, then offers the tour', () => {
			const [intro, offer] = new Adventure(world).begin();
			expect(intro.lines[0]).toBe(INTRO[0]);
			expect(intro.title).toBeUndefined();
			expect(offer.lines.join(' ')).toContain('take the tour');
		});

		it('introduces Guide without explaining the piece', () => {
			const [intro] = new Adventure(world).begin();
			expect(intro.lines).toHaveLength(2);
			expect(intro.lines.join(' ')).not.toMatch(/written down|fill the gaps/);
		});

		it('dates the map Guide carries, when it has a date', () => {
			const [intro] = new Adventure({ ...world, asOf: '2026-10-24' }).begin();
			expect(intro.lines.join(' ')).toContain('24 October 2026');
		});

		it('says today’s weather beside the map’s date, when there is word of it', () => {
			const now = currentWeatherFacts({
				current: { time: '2026-10-25T16:45', weather_code: 61, temperature_2m: 11 }
			});
			const [intro] = new Adventure({ ...world, asOf: '2026-10-24' }).begin(now);
			expect(intro.lines.join(' ')).toContain('dated 24 October 2026. Today: light rain, 11 °C.');
		});

		it('tells the weather when asked, and only what it has word of', () => {
			const now = currentWeatherFacts({
				current: { time: '2026-10-25T16:45', weather_code: 3, temperature_2m: 12 }
			});
			const told = new Adventure(world);
			told.begin(now);
			told.respond('take the tour');
			expect(told.respond('weather').lines).toEqual(['Today: overcast, 12 °C.']);
			const untold = new Adventure(world);
			untold.begin();
			untold.respond('take the tour');
			expect(untold.respond('sky').lines).toEqual(['I have no word of the weather today.']);
		});

		it('begins the tour at the start', () => {
			const game = begun();
			game.here = 'c';
			expect(game.respond('Take the tour.').title).toBe('Mill Parade');
		});

		it('offers the tour again to anything else', () => {
			const game = begun();
			expect(game.respond('north').lines.join(' ')).toContain('take the tour');
			expect(game.respond('').lines).toEqual([]);
		});

		it('plays as usual once begun', () => {
			const game = begun();
			game.respond('take the tour');
			expect(game.respond('go west').title).toBe('Mill Parade west');
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

describe('Fragments Guide carries', () => {
	const chain = (n: number): AdventureWorld => ({
		start: 's0',
		stops: Object.fromEntries(
			Array.from({ length: n }, (_, i) => [
				`s${i}`,
				{
					title: `Stop ${i}`,
					paragraphs: [`You are at stop ${i}.`, 'Exits: east, west.'],
					exits: [
						...(i < n - 1 ? [{ label: 'east', to: `s${i + 1}` }] : []),
						...(i > 0 ? [{ label: 'west', to: `s${i - 1}` }] : [])
					],
					things: [],
					...(i === 0 ? { fragments: ['ld Invented Mill'] } : {})
				}
			])
		)
	});
	const walk = (game: Adventure, ...ways: string[]) => ways.map((w) => game.respond(w));
	const begun = (n = 8, chance = () => 0) => {
		const game = new Adventure(chain(n));
		game.chance = chance;
		game.begin();
		game.respond('take the tour');
		return game;
	};

	it('brings a fragment back four moves on, before the exits, saying nothing of where it was', () => {
		const replies = walk(begun(), 'east', 'east', 'east', 'east');
		expect(
			replies
				.slice(0, 3)
				.flatMap((r) => r.lines)
				.join(' ')
		).not.toContain('ld Invented Mill');
		const lines = replies[3].lines;
		expect(lines.at(-1)).toBe('Exits: east, west.');
		const recalled = lines.find((l) => l.includes('“ld Invented Mill”'));
		expect(recalled).toBeDefined();
		expect(recalled).not.toMatch(/stop|\d/i);
	});

	it('brings each fragment back once at most', () => {
		const game = begun();
		walk(game, 'east', 'east', 'east', 'east');
		const later = walk(game, 'east', 'east', 'west');
		expect(later.flatMap((r) => r.lines).join(' ')).not.toContain('ld Invented Mill');
	});

	it('never brings a fragment back where it was found', () => {
		const game = begun();
		const back = walk(game, 'east', 'east', 'west', 'west');
		expect(back[3].lines.filter((l) => l.includes('ld Invented Mill'))).toEqual([]);
	});

	it('leaves it to chance', () => {
		const replies = walk(
			begun(8, () => 0.99),
			'east',
			'east',
			'east',
			'east',
			'east'
		);
		expect(replies.flatMap((r) => r.lines).join(' ')).not.toContain('ld Invented Mill');
	});
});

describe('Chance', () => {
	const stop = (i: number, terms?: { term: string; said: string; street?: boolean }[]) => ({
		title: `Stop ${i}`,
		paragraphs: [`You are at stop ${i}.`, 'Exits: east, west.'],
		exits: [
			{ label: 'east', to: `s${i + 1}` },
			{ label: 'west', to: `s${i - 1}` }
		],
		things: [],
		...(terms ? { terms } : {})
	});
	const world = (stops: Record<number, ReturnType<typeof stop>>): AdventureWorld => ({
		start: 's0',
		stops: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`s${i}`, stops[i] ?? stop(i)]))
	});
	const play = (w: AdventureWorld, moves: string[], chance = () => 0) => {
		const game = new Adventure(w);
		game.chance = chance;
		game.begin();
		game.respond('take the tour');
		return moves.map((m) => game.respond(m).lines.join(' '));
	};
	const quillon = { term: 'quillon', said: 'The Quillon Arms' };
	const row = { term: 'quillon', said: 'Quillon Row', street: true };

	it('sets two names side by side when they share a word, met in different places', () => {
		const said = play(world({ 0: stop(0, [quillon]), 4: stop(4, [row]) }), [
			'east',
			'east',
			'east',
			'east'
		]);
		expect(said[3]).toContain('“Quillon Row”. Earlier, “The Quillon Arms”.');
		expect(said.slice(0, 3).join(' ')).not.toContain('Earlier');
	});

	it('does not connect a name with itself, nor two places on the same street', () => {
		const again = play(world({ 0: stop(0, [quillon]), 4: stop(4, [quillon]) }), [
			'east',
			'east',
			'east',
			'east'
		]);
		expect(again.join(' ')).not.toContain('Earlier');
		const streets = play(
			world({
				0: stop(0, [{ ...row, said: 'Quillon Row' }]),
				4: stop(4, [{ ...row, said: 'Quillon Row West' }])
			}),
			['east', 'east', 'east', 'east']
		);
		expect(streets.join(' ')).not.toContain('Earlier');
	});

	it('does not connect a name with one that only adds to it', () => {
		const said = play(
			world({
				0: stop(0, [{ term: 'quillon', said: 'Quillon Close', street: true }]),
				4: stop(4, [{ term: 'quillon', said: '31-59 Quillon Close' }])
			}),
			['east', 'east', 'east', 'east']
		);
		expect(said.join(' ')).not.toContain('Earlier');
	});

	it('does it twice a walk at most', () => {
		const terms = (word: string, i: number) => [{ term: word, said: `${word} ${i}` }];
		const w = world({
			0: stop(0, [...terms('alpha', 0), ...terms('beta', 0), ...terms('gamma', 0)]),
			4: stop(4, terms('alpha', 4)),
			5: stop(5, terms('beta', 5)),
			6: stop(6, terms('gamma', 6))
		});
		const said = play(w, ['east', 'east', 'east', 'east', 'east', 'east']);
		expect(said.filter((s) => s.includes('Earlier'))).toHaveLength(2);
	});

	it('leaves it to chance', () => {
		const said = play(
			world({ 0: stop(0, [quillon]), 4: stop(4, [row]) }),
			['east', 'east', 'east', 'east'],
			() => 0.99
		);
		expect(said.join(' ')).not.toContain('Earlier');
	});
});
