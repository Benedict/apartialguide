import { describe, expect, it } from 'vitest';
import { Adventure, INTRO } from './engine';
import type { AdventureWorld } from './world';
import { currentWeatherFacts } from '../adapters/weather';
import { heavensFacts } from '../adapters/heavens';
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
				'The map is not the only account. Others have been kept, by the Food Standards Agency, HM Land Registry and Wikidata. Where they disagree with the map, I leave them disagreeing.',
				'By another account, the map runs into 9 wards, most of it in Inventa East and Inventa West. I will say when we cross from one to another.'
			]);
		});

		it('names each keeper as one would in a sentence', () => {
			const [intro] = new Adventure({
				...world,
				asOf: '2026-10-24',
				about: {
					streets: 1,
					places: 1,
					accounts: [
						'Wikidata',
						'police.uk',
						'Food Standards Agency',
						'Historic England',
						'London Planning Datahub',
						'Open Plaques',
						'HM Land Registry',
						'Greater London Authority',
						'Office for National Statistics'
					]
				}
			}).begin();
			expect(intro.lines[2]).toContain(
				'by Wikidata, police.uk, the Food Standards Agency, Historic England, the London Planning Datahub, Open Plaques, HM Land Registry, the Greater London Authority and the Office for National Statistics.'
			);
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

	describe('wards, by another account', () => {
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
			expect(touring().first.lines[0]).toBe('By another account, you are in Inventa West, a ward.');
		});

		it('says nothing of wards on a step within one', () => {
			const { game } = touring();
			expect(game.respond('east').lines.join(' ')).not.toContain('By another account, you');
		});

		it('tells a step from one ward into another, first', () => {
			const { game } = touring();
			game.respond('east');
			expect(game.respond('east').lines[0]).toBe(
				'By another account, you have left Inventa West for Inventa East.'
			);
			expect(game.respond('west').lines[0]).toBe(
				'By another account, you have left Inventa East for Inventa West.'
			);
		});

		it('tells a step out of every ward it knows', () => {
			const { game } = touring();
			game.respond('east');
			expect(game.respond('north').lines[0]).toBe(
				'By another account, you have left Inventa West.'
			);
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
	});
});
