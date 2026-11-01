import { describe, expect, it } from 'vitest';
import { Adventure, INTRO, OFFER, introduction } from './engine';
import { hearsay } from '../render/hearsay';
import type { AdventureWorld } from './world';
import { MemorySaves } from './saves';
import { currentWeatherFacts } from '../adapters/weather';
import { heavensFacts } from '../adapters/heavens';
import { currentAirFacts } from '../adapters/air';
import { arrivalFacts } from '../adapters/tfl';

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

		it('offers the tour as something to click as well as type', () => {
			const [, offer] = new Adventure(world).begin();
			expect(offer.actions).toEqual([{ label: 'Take the tour', command: 'take the tour' }]);
		});

		it('gives an account of what Guide carries, from the map and the other accounts', () => {
			const [intro] = new Adventure({
				...world,
				asOf: '2026-10-24',
				about: {
					streets: 412,
					places: 5688,
					oldest: '2009-03-14',
					accounts: ['Food Standards Agency', 'HM Land Registry', 'Wikidata'],
					areas: { kind: 'ward', count: 9, most: ['Inventa East', 'Inventa West'] }
				}
			}).begin();
			expect(intro.lines).toEqual([
				INTRO[0],
				'I walk by a map. Mine is dated 24 October 2026: 412 named streets and 5,688 places to stand, the oldest of them last recorded in March 2009. Beyond it there may be more. I could not say what.',
				'The map is not the only account. Others have been kept: by those who inspect kitchens, those who write down what houses sell for and those who keep an encyclopaedia of everything. Where they disagree with the map, I leave them disagreeing.',
				`${hearsay('the map runs into 9 wards, most of it in Inventa East and Inventa West')} I will say when we cross from one to another.`
			]);
		});

		it('never names who kept the other accounts', () => {
			const [intro] = new Adventure({
				...world,
				asOf: '2026-10-24',
				about: { streets: 1, places: 1, accounts: ['Wikidata', 'Invented Registry'] }
			}).begin();
			const text = intro.lines.join(' ');
			expect(text).toContain(
				'Others have been kept: by those who keep an encyclopaedia of everything, and others.'
			);
			expect(text).not.toMatch(/Wikidata|Invented Registry/);
		});

		it('tells the air with the weather, when there is word of it', () => {
			const now = [
				...currentWeatherFacts({
					current: { time: '2026-10-25T16:45', weather_code: 61, temperature_2m: 11 }
				}),
				...currentAirFacts({ current: { time: '2026-10-25T16:00', european_aqi: 32 } })
			];
			const game = new Adventure({
				...world,
				asOf: '2026-10-24',
				about: { streets: 1, places: 1, accounts: [] }
			});
			const [intro] = game.begin(now);
			expect(intro.lines.at(-1)).toBe(
				'Today: light rain, 11 °C. The air: fair, 32 on the European index.'
			);
			game.respond('take the tour');
			expect(game.respond('weather').lines[0]).toContain('The air: fair');
		});

		it('ends the account with the sky, when there is word of it', () => {
			const now = currentWeatherFacts({
				current: { time: '2026-10-25T16:45', weather_code: 61, temperature_2m: 11 }
			});
			const [intro] = new Adventure({
				...world,
				asOf: '2026-10-24',
				about: { streets: 2, places: 3, accounts: [] }
			}).begin(now);
			expect(intro.lines.at(-1)).toBe('Today: light rain, 11 °C.');
			expect(intro.lines.join(' ')).not.toContain('The map is not the only account');
		});

		it('introduces Guide from the head of the world alone, before the map is opened', () => {
			const head = {
				asOf: '2026-10-24',
				about: { streets: 412, places: 5688, accounts: ['Wikidata'] }
			};
			const [intro] = new Adventure({ ...world, ...head }).begin();
			expect(introduction(head)).toEqual(intro);
			expect(introduction({}).lines).toEqual(new Adventure(world).begin()[0].lines);
		});

		it('offers the tour once the map is open, the day told first when there is word of it', () => {
			const now = currentWeatherFacts({
				current: { time: '2026-10-25T16:45', weather_code: 61, temperature_2m: 11 }
			});
			const game = new Adventure(world);
			expect(game.offer(now)).toEqual([
				{ lines: ['Today: light rain, 11 °C.'] },
				{ lines: [OFFER], actions: [{ label: 'Take the tour', command: 'take the tour' }] }
			]);
			expect(new Adventure(world).offer()).toHaveLength(1);
			expect(game.respond('take the tour').title).toBeDefined();
		});

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

		it('says where the sun stands, after the weather, when the facts give it', () => {
			const now = [
				...currentWeatherFacts({
					current: { time: '2026-06-21T13:00', weather_code: 0, temperature_2m: 24 }
				}),
				...heavensFacts(new Date('2026-06-21T12:00:00Z'), { latitude: 51.38, longitude: -0.07 })
			];
			const game = new Adventure({ ...world, asOf: '2026-06-20' });
			const [intro] = game.begin(now);
			expect(intro.lines.join(' ')).toContain('Today: clear, 24 °C. The sun is high in the south.');
			game.respond('take the tour');
			expect(game.respond('weather').lines).toEqual([
				'Today: clear, 24 °C. The sun is high in the south.'
			]);
		});

		it('tells of the sky without the weather, when there is no word of the weather', () => {
			const now = heavensFacts(new Date('2026-06-21T12:00:00Z'), {
				latitude: 51.38,
				longitude: -0.07
			});
			const game = new Adventure(world);
			game.begin(now);
			game.respond('take the tour');
			expect(game.respond('sky').lines).toEqual([
				'I have no word of the weather today. The sun is high in the south.'
			]);
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
		expect(new Adventure(world).respond('dance').lines[0]).toMatch(/I don’t know the word “dance”/);
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
		// Guide carries only what it is asked to.
		game.respond('remember ld invented mill');
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

describe('Not repeating itself', () => {
	type P = NonNullable<AdventureWorld['stops'][string]['parts']>[number][number];
	const part = (kind: P['kind'], text: string, more: Partial<P> = {}): P => ({
		kind,
		text,
		key: text,
		...more
	});
	const room = (i: number, parts: P[][]) => ({
		title: 'Long Street',
		paragraphs: parts.map((p) => p.map((x) => x.text).join(' ')),
		parts,
		exits: [
			{ label: 'east', to: `s${i + 1}` },
			{ label: 'west', to: `s${i - 1}` }
		],
		things: []
	});
	const crowd = ['There is a great deal here.', 'Too much to take in at once.'];
	const stop = (i: number, things: string[]) =>
		room(i, [
			[
				part('where', 'You are standing on Long Street, between A and B.', {
					street: 'Long Street'
				}),
				part('street', 'Asphalt underfoot.'),
				part(
					'setting',
					`Here you are beside a residential area to the ${i % 2 ? 'north' : 'south'}.`,
					{
						key: 'a residential area'
					}
				)
			],
			[
				part('frame', crowd[0], { options: crowd }),
				...things.map((t) => part('thing', `To the north is ${t}.`, { key: t })),
				part('frame', 'And more — I lose count.')
			],
			[part('exits', 'Exits: east, west.')]
		]);
	const world: AdventureWorld = {
		start: 's0',
		stops: {
			s0: stop(0, ['a pub', 'a bakery']),
			s1: stop(1, ['a pub', 'a florist']),
			s2: stop(2, ['a pub']),
			s3: stop(3, ['a chapel']),
			s4: stop(4, ['a forge'])
		}
	};
	const walk = () => {
		const game = new Adventure(world);
		game.begin();
		return [
			game.respond('take the tour'),
			game.respond('east'),
			game.respond('east'),
			game.respond('east')
		];
	};

	it('never opens two places in a row with the same form of words', () => {
		const at = (i: number, street: string) =>
			room(i, [
				[
					part('where', `You are standing on ${street}.`, {
						street,
						options: [`You are standing on ${street}.`, `${street}.`, `On ${street}.`]
					})
				],
				[part('exits', 'Exits: east, west.')]
			]);
		const game = new Adventure({
			start: 's0',
			stops: { s0: at(0, 'A Road'), s1: at(1, 'B Road'), s2: at(2, 'C Road'), s3: at(3, 'D Road') }
		});
		game.begin();
		const openings = [
			game.respond('take the tour'),
			game.respond('east'),
			game.respond('east'),
			game.respond('east')
		].map((r) => r.lines[0]);
		expect(openings).toEqual([
			'You are standing on A Road.',
			'B Road.',
			'On C Road.',
			'You are standing on D Road.'
		]);
	});

	it('points to the same nearest name once, not at every step', () => {
		const near = (i: number, name: string) =>
			room(i, [
				[part('where', 'You are standing on Long Street.', { street: 'Long Street' })],
				[
					part('nearest', `The nearest name is “${name}”, a cafe, ${i}0 metres to the north.`, {
						key: name
					})
				],
				[part('exits', 'Exits: east, west.')]
			]);
		const game = new Adventure({
			start: 's0',
			stops: { s0: near(0, 'Inventa Cafe'), s1: near(1, 'Inventa Cafe'), s2: near(2, 'Other Cafe') }
		});
		game.begin();
		expect(game.respond('take the tour').lines.join(' ')).toContain('Inventa Cafe');
		expect(game.respond('east').lines.join(' ')).not.toContain('Inventa Cafe');
		expect(game.respond('east').lines.join(' ')).toContain('Other Cafe');
	});

	it('says the street and the setting once, and goes on along the street without starting again', () => {
		const [first, second] = walk();
		expect(first.lines[0]).toContain('Asphalt underfoot.');
		expect(second.lines[0]).not.toContain('Asphalt underfoot.');
		expect(second.lines[0]).not.toContain('residential area');
		expect(second.lines[0]).toMatch(/^(Further along|Still on) Long Street, between A and B\.$/);
	});

	it('does not describe again a thing it has just described', () => {
		const [, second] = walk();
		expect(second.lines[1]).not.toContain('a pub');
		expect(second.lines[1]).toContain('a florist');
	});

	it('drops its framing when nothing new is left to frame', () => {
		const [, , third] = walk();
		expect(third.lines.join(' ')).not.toMatch(/great deal|take in|lose count/);
		expect(third.lines.at(-1)).toBe('Exits: east, west.');
	});

	it('says a place is crowded, or loses count, at most once in any three places', () => {
		const said = walk().map((r) => /great deal|take in/.test(r.lines.join(' ')));
		expect(said).toEqual([true, false, false, true]);
		const lost = walk().map((r) => /lose count/.test(r.lines.join(' ')));
		expect(lost).toEqual([true, false, false, true]);
	});

	it('does not frame two places in a row the same way', () => {
		const [first, second] = walk();
		expect(first.lines[1].split('.')[0]).not.toBe(second.lines[1].split('.')[0]);
	});

	it('forgets after two places, and says it all again when asked to look', () => {
		const [, , , fourth] = walk();
		expect(fourth.lines[0]).toContain('Asphalt underfoot.');
		const game = new Adventure(world);
		game.begin();
		game.respond('take the tour');
		game.respond('east');
		expect(game.respond('look').lines[0]).toContain('Asphalt underfoot.');
	});
});

describe('Examining what is here', () => {
	const pub = {
		id: 'node/1',
		name: 'The Sextant',
		aliases: ['sextant', 'pub'],
		description: 'A pub, “The Sextant”.'
	};
	const bakery = { id: 'node/2', name: 'bakery', aliases: ['bakery'], description: 'A bakery.' };
	const street = {
		id: 'way/1',
		name: 'Long Street',
		aliases: ['long', 'street', 'road', 'here'],
		description: 'Long Street. Asphalt underfoot.'
	};
	const world: AdventureWorld = {
		start: 'a',
		stops: {
			a: {
				title: 'Long Street',
				paragraphs: ['You are standing on Long Street.'],
				exits: [],
				things: [pub, bakery],
				streets: [street]
			},
			b: {
				title: 'Empty Row',
				paragraphs: ['You are standing on Empty Row.'],
				exits: [],
				things: [],
				streets: [{ ...street, name: 'Empty Row', aliases: ['empty', 'row', 'street', 'here'] }]
			}
		}
	};

	it('describes the street underfoot', () => {
		const game = new Adventure(world);
		expect(game.respond('examine street').lines).toEqual(['Long Street. Asphalt underfoot.']);
		expect(game.respond('x long street').lines).toEqual(['Long Street. Asphalt underfoot.']);
		expect(game.respond('examine the road').lines).toEqual(['Long Street. Asphalt underfoot.']);
	});

	it('lists what there is to examine, when asked to examine everything or nothing in particular', () => {
		const game = new Adventure(world);
		for (const asked of ['examine things', 'examine everything', 'examine'])
			expect(game.respond(asked).lines).toEqual([
				'You could examine Long Street, The Sextant, or a bakery.'
			]);
	});

	it('leaves the setting out of what there is to examine, and names each thing once', () => {
		const land = {
			id: 'way/9',
			name: 'residential area',
			aliases: ['residential'],
			description: 'Land.',
			background: true
		};
		const game = new Adventure({
			...world,
			stops: { a: { ...world.stops.a, things: [pub, land, { ...pub, id: 'node/3' }] } }
		});
		expect(game.respond('examine').lines).toEqual([
			'You could examine Long Street, or The Sextant.'
		]);
	});

	it('says so when there is only the street', () => {
		const game = new Adventure(world, 'b');
		expect(game.respond('examine things').lines).toEqual([
			'There is nothing here to examine but Empty Row.'
		]);
	});
});

describe('Departures', () => {
	const stop = { name: 'Invented Corner', kind: 'bus' as const, naptan: '490000000X' };
	const world: AdventureWorld = {
		start: 'a',
		stops: {
			a: { title: 'Long Street', paragraphs: ['Here.'], exits: [], things: [], transit: [stop] }
		}
	};

	it('names the stops here that TfL has arrivals for', () => {
		expect(new Adventure(world).transitHere()).toEqual([stop]);
	});

	it('tells what is due, says when nothing is, and says nothing without an answer', () => {
		const game = new Adventure(world);
		const facts = arrivalFacts(
			[
				{
					id: '1',
					lineName: '410',
					destinationName: 'Invented Palace',
					timeToStation: 185,
					modeName: 'bus'
				}
			],
			stop.name,
			'2026-10-25T20:15:00Z'
		);
		expect(game.departures(stop, facts)).toEqual({
			lines: ['Invented Corner: the 410 to Invented Palace in 3 minutes.']
		});
		expect(game.departures(stop, [])).toEqual({ lines: ['Invented Corner: nothing is due.'] });
		expect(game.departures(stop, undefined)).toBeUndefined();
	});

	describe('wards, as hearsay', () => {
		const ward = (name: string) => ({ name, kind: 'ward' });
		const wardWorld: AdventureWorld = {
			start: 'a',
			stops: {
				a: { ...room('Mill Parade', [{ label: 'east', to: 'b' }]), area: ward('Inventa West') },
				b: {
					...room('Cross Row', [
						{ label: 'east', to: 'c' },
						{ label: 'north', to: 'd' }
					]),
					area: ward('Inventa West')
				},
				c: { ...room('Weir Steps', [{ label: 'west', to: 'b' }]), area: ward('Inventa East') },
				d: room('Blind Alley', [])
			}
		};
		const touring = () => {
			const game = new Adventure(wardWorld);
			game.begin();
			return { game, first: game.respond('take the tour') };
		};

		it('says which ward the tour begins in', () => {
			expect(touring().first.lines[0]).toBe(hearsay('you are in Inventa West, a ward'));
		});

		it('says nothing of wards on a step within one', () => {
			const { game } = touring();
			expect(game.respond('east').lines.join(' ')).not.toMatch(/you (are in|have left) Inventa/);
		});

		it('tells a step from one ward into another, first', () => {
			const { game } = touring();
			game.respond('east');
			expect(game.respond('east').lines[0]).toBe(
				hearsay('you have left Inventa West for Inventa East')
			);
			expect(game.respond('west').lines[0]).toBe(
				hearsay('you have left Inventa East for Inventa West')
			);
		});

		it('tells a step out of every ward it knows', () => {
			const { game } = touring();
			game.respond('east');
			expect(game.respond('north').lines[0]).toBe(hearsay('you have left Inventa West'));
		});
	});

	describe('gps', () => {
		const placed: AdventureWorld = {
			start: 'a',
			stops: {
				a: { ...room('Mill Parade', [{ label: 'east', to: 'b' }]), at: [51.38, -0.07] },
				b: room('Cross Row', [])
			}
		};
		const touring = () => {
			const game = new Adventure(placed);
			game.begin();
			game.respond('take the tour');
			return game;
		};

		it('gives where the map puts this stop, with a link to it on Google Maps', () => {
			expect(touring().respond('gps')).toEqual({
				lines: ['By the map, you are at 51.38000, -0.07000.'],
				map: { latitude: 51.38, longitude: -0.07, label: 'Mill Parade' },
				link: {
					href: 'https://www.google.com/maps/search/?api=1&query=51.38000%2C-0.07000',
					text: 'See it on Google Maps'
				}
			});
		});

		it('says so when the map gives no place for the stop', () => {
			const game = touring();
			game.respond('east');
			expect(game.respond('gps')).toEqual({ lines: ['I cannot say where this is on any map.'] });
		});

		// An invented street of three stops, each with a place on the map.
		const street: AdventureWorld = {
			start: 'a',
			stops: {
				a: { ...room('Mill Parade', [{ label: 'east', to: 'b' }]), at: [51.38, -0.07] },
				b: {
					...room('Cross Row', [
						{ label: 'west', to: 'a' },
						{ label: 'east', to: 'c' }
					]),
					at: [51.38, -0.069]
				},
				c: { ...room('Weir Steps', [{ label: 'west', to: 'b' }]), at: [51.38, -0.068] }
			}
		};
		const walking = () => {
			const game = new Adventure(street);
			game.begin();
			game.respond('take the tour');
			return game;
		};

		it('gives the map once with gps, and not again on the next step', () => {
			const game = walking();
			expect(game.respond('gps').follow).toBeUndefined();
			const next = game.respond('east');
			expect(next.map).toBeUndefined();
			expect(next.follow).toBeUndefined();
		});

		it('keeps the map beside the reader, stop after stop, with gps on', () => {
			const game = walking();
			const on = game.respond('gps on');
			expect(on.follow).toBe(true);
			expect(on.map).toEqual({ latitude: 51.38, longitude: -0.07, label: 'Mill Parade' });
			expect(on.lines[0]).toBe('I will keep the map beside you as we go.');
			const next = game.respond('east');
			expect(next.follow).toBe(true);
			expect(next.map).toEqual({ latitude: 51.38, longitude: -0.069, label: 'Cross Row' });
			expect(game.respond('east').map?.label).toBe('Weir Steps');
		});

		it('puts the map away with gps off', () => {
			const game = walking();
			game.respond('gps on');
			const off = game.respond('gps off');
			expect(off).toEqual({ lines: ['I put the map away.'], follow: false });
			const next = game.respond('east');
			expect(next.map).toBeUndefined();
			expect(next.follow).toBeUndefined();
		});

		it('keeps the map on through a walk saved and picked up again', () => {
			const game = walking();
			game.saves = new MemorySaves();
			game.respond('gps on');
			game.respond('east');
			game.respond('save 1');
			const later = new Adventure(street);
			later.saves = game.saves;
			later.begin();
			const back = later.respond('restore 1');
			expect(back.follow).toBe(true);
			expect(back.map?.label).toBe('Cross Row');
		});
	});

	describe('zones, as hearsay', () => {
		const zone = (name: string, kind: string) => ({ name, kind });
		const zoned: AdventureWorld = {
			start: 'a',
			stops: {
				a: room('Mill Parade', [{ label: 'east', to: 'b' }]),
				b: {
					...room('Cross Row', [
						{ label: 'west', to: 'a' },
						{ label: 'east', to: 'c' }
					]),
					zones: [
						zone('Flood Zone 3', 'flood zone'),
						zone('the flood of September 1968', 'recorded flood')
					]
				},
				c: {
					...room('Weir Steps', [{ label: 'west', to: 'b' }]),
					zones: [zone('Flood Zone 3', 'flood zone')]
				}
			}
		};
		const touring = () => {
			const game = new Adventure(zoned);
			game.begin();
			game.respond('take the tour');
			return game;
		};

		it('tells a step into zones, each once', () => {
			expect(touring().respond('east').lines.slice(0, 2)).toEqual([
				hearsay('you are within Flood Zone 3, a flood zone'),
				hearsay('you are within the flood of September 1968, a recorded flood')
			]);
		});

		it('tells a step out of one, and nothing of one still around you', () => {
			const game = touring();
			game.respond('east');
			const lines = game.respond('east').lines;
			expect(lines[0]).toBe(hearsay('you have come out of the flood of September 1968'));
			expect(lines.join(' ')).not.toContain('Flood Zone 3');
		});
	});

	describe('the roads and the news, as the page asks after them', () => {
		const fact = (subject: string, key: string, value: string) => ({
			id: `${subject}:${key}`,
			subject,
			claim: { key, value },
			source: 'TfL',
			observed: '2026-10-30',
			reach: 0,
			geometry: []
		});
		// An invented disruption on an invented road.
		const works = [
			fact('tfl/T1', 'comments', 'Invented Road - Lane closed.'),
			fact('tfl/T1', 'end', '2026-11-03T18:00:00Z'),
			fact('tfl/T1', 'metres', '40')
		];

		it('tells works on the road here once a walk, and nothing with no answer', () => {
			const game = new Adventure(world);
			game.begin();
			game.respond('take the tour');
			expect(game.disruptions(works)?.lines).toEqual([
				'They say of the road here: “Invented Road - Lane closed.”, until 3 November.'
			]);
			expect(game.disruptions(works)).toBeUndefined();
			expect(game.disruptions(undefined)).toBeUndefined();
		});

		it('asks the page for the news, and tells up to three headlines as hearsay of the place', () => {
			const game = new Adventure(world);
			game.begin();
			game.respond('take the tour');
			expect(game.respond('news').ask).toBe('news');
			const titles = ['One invented headline', 'Two', 'Three', 'Four'].map((title) => ({
				title,
				seen: '2026-10-31'
			}));
			expect(game.news({ place: 'Inventon', articles: titles }).lines).toEqual([
				'It is said today, of Inventon: “One invented headline”.',
				'And: “Two”.',
				'And: “Three”.'
			]);
		});

		it('owns to no news without an answer, or with none to tell', () => {
			const game = new Adventure(world);
			expect(game.news(undefined).lines).toEqual(['No news reaches me.']);
			expect(game.news({ place: 'Inventon', articles: [] }).lines).toEqual(['No news reaches me.']);
		});
	});
});

describe('A world whose ways are roads, not exits', () => {
	const roads = (own: boolean): AdventureWorld => ({
		start: 'a',
		ways: 'Ways',
		stops: {
			a: {
				title: 'Inventon',
				paragraphs: [
					'Inventon: a settlement.',
					...(own ? ['Ways: east, 9 km along “Inventa Way”.'] : [])
				],
				exits: [{ label: 'east', to: 'b' }],
				things: []
			},
			b: {
				title: 'Fortham',
				paragraphs: ['Fortham: a fort.', 'Ways: west, 9 km along “Inventa Way”.'],
				exits: [{ label: 'west', to: 'a' }],
				things: []
			}
		}
	});
	const back = (world: AdventureWorld) => {
		const game = new Adventure(world);
		game.begin();
		game.respond('take the tour');
		game.respond('east');
		return game.respond('west');
	};

	it('tells its own ways again, briefly, on a return', () => {
		expect(back(roads(true)).lines.at(-1)).toBe('Ways: east, 9 km along “Inventa Way”.');
	});

	it('names the ways in its own word where a place does not spell them out', () => {
		const lines = back(roads(false)).lines;
		expect(lines.at(-1)).toBe('Ways: east.');
		expect(lines.join(' ')).not.toContain('Exits');
	});
});

describe('a line said again as the last, where a world gives it a way to be', () => {
	const part = (kind: 'prose' | 'setting', text: string, again?: string) => ({
		kind,
		text,
		key: text,
		...(again ? { again } : {})
	});
	const place = (name: string, kept: string, next?: string, back?: string) => ({
		title: name,
		paragraphs: [`${name}.`, kept],
		parts: [
			[
				part('prose', `${name}.`),
				part('setting', kept, `As the last: ${kept.replace(/^Kept: /, '')}`)
			]
		],
		exits: [
			...(next ? [{ label: 'east', to: next }] : []),
			...(back ? [{ label: 'west', to: back }] : [])
		],
		things: []
	});
	const world: AdventureWorld = {
		start: 'a',
		stops: {
			a: place('Inventhaugh', 'Kept: Assumed.', 'b'),
			b: place('Farhaugh', 'Kept: Assumed.', 'c', 'a'),
			c: place('Nearhaugh', 'Kept: Known.', 'd', 'b'),
			d: place('Lasthaugh', 'Kept: Assumed.', undefined, 'c')
		}
	};
	const walk = () => {
		const game = new Adventure(world);
		game.begin();
		return [
			game.respond('take the tour'),
			game.respond('east'),
			game.respond('east'),
			game.respond('east')
		].map((r) => r.lines.join(' '));
	};

	it('says it as the last where it was heard at the last place', () => {
		const [first, second] = walk();
		expect(first).toContain('Kept: Assumed.');
		expect(second).toContain('As the last: Assumed.');
		expect(second).not.toContain('Kept: Assumed.');
	});

	it('says it in full where it was heard only before the last place, or not at all', () => {
		const [, , third, fourth] = walk();
		expect(third).toContain('Kept: Known.');
		expect(fourth).toContain('Kept: Assumed.');
		expect(fourth).not.toContain('As the last');
	});
});
