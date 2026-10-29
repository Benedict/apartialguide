import { describe, expect, it } from 'vitest';
import { destination, type LatLon } from '../geo';
import type { Scene } from '../scene';
import { facts } from '../testing/facts';
import { SyntheticMap } from '../testing/synthetic';
import { AdventureRenderer } from './adventure';
import { aside } from './hearsay';

const O = SyntheticMap.ORIGIN;
const renderer = new AdventureRenderer();
const everton = facts('way/1', {
	highway: 'residential',
	name: 'Everton Road',
	surface: 'asphalt',
	lit: 'yes',
	maxspeed: '20 mph',
	sidewalk: 'both'
});

const scene = (s: Partial<Scene> = {}): Scene => ({
	stopId: 's1',
	street: everton,
	beats: [],
	hidden: [],
	mood: 'plain',
	position: O,
	kind: 'corridor',
	here: ['Everton Road'],
	exits: [],
	...s
});

const north = (metres: number) => ({ geometry: [destination(O, 0, metres)] });
const text = (s: Scene) => renderer.render(s).paragraphs.join('\n\n');
const beat = (
	subject: string,
	tags: Record<string, string>,
	extra = {},
	effects: ('spoken-as-found' | 'tense-slip')[] = []
) => ({
	subject,
	facts: facts(subject, tags, { ...north(15), ...extra }),
	effects
});

describe('AdventureRenderer', () => {
	describe('where you stand', () => {
		it('puts you on the street, between the streets at either end', () => {
			expect(text(scene({ between: ['Clyde Road', 'Havelock Road'] }))).toContain(
				'You are standing on Everton Road, between Clyde Road and Havelock Road.'
			);
		});

		it('puts you where streets meet', () => {
			const s = scene({ kind: 'junction', here: ['Everton Road', 'Clyde Road'] });
			expect(text(s)).toContain('You are standing where Everton Road and Clyde Road meet.');
			expect(renderer.render(s).title).toBe('Everton Road and Clyde Road');
		});

		it('puts you at the end of a dead end', () => {
			const s = scene({
				kind: 'junction',
				exits: [{ label: 'west', to: 'x', street: 'Everton Road' }]
			});
			expect(text(s)).toContain('You are at the end of Everton Road.');
		});

		it('describes the street underfoot', () => {
			const t = text(scene());
			expect(t).toContain('Asphalt underfoot.');
			expect(t).toContain('Lit at night, with pavement on both sides.');
			expect(t).toContain('20 mph');
		});
	});

	describe('what you see', () => {
		it('places a feature by direction and distance', () => {
			const t = text(scene({ beats: [beat('node/2', { amenity: 'pub', name: 'The Sextant' })] }));
			expect(t).toContain('To the north, a few steps away, is a pub, “The Sextant”.');
		});

		it('speaks a broken name exactly as found', () => {
			const t = text(
				scene({
					beats: [
						beat('way/2', { old_name: 'est Bank', 'disused:amenity': 'bank' }, {}, [
							'spoken-as-found'
						])
					]
				})
			);
			expect(t).toContain('“est Bank”');
			expect(t).not.toMatch(/\p{L}est Bank/u);
		});

		it('calls a building by what it is built as', () => {
			expect(text(scene({ beats: [beat('way/6', { building: 'retail' })] }))).toContain(
				'is a retail building.'
			);
			expect(text(scene({ beats: [beat('way/7', { building: 'church' })] }))).toContain(
				'is a church.'
			);
		});

		describe('the land you stand in', () => {
			const square = (centre: LatLon, half: number) =>
				[45, 135, 225, 315, 45].map((b) => destination(centre, b, half * Math.SQRT2));
			const area = (subject: string, tags: Record<string, string>, geometry: LatLon[]) => ({
				subject,
				facts: facts(subject, tags, { geometry }),
				effects: []
			});
			const around = area('way/8', { landuse: 'residential' }, square(O, 50));
			const east = area('way/9', { landuse: 'residential' }, square(destination(O, 90, 30), 10));
			const shops = area(
				'way/10',
				{ landuse: 'retail', name: 'Village shops', 'addr:housenumber': '1-9' },
				square(destination(O, 315, 20), 8)
			);
			const suburb = beat('node/13', { place: 'suburb', name: 'Addiscombe' });
			const t = text(scene({ beats: [around, east, shops, suburb] }));

			it('folds into one sentence of setting', () => {
				expect(t).toContain(
					'Here you are in Addiscombe, in a residential area, and beside a retail area, “Village shops”, to the north-west.'
				);
			});

			it('is not told piece by piece', () => {
				expect(t).not.toContain('is a residential area');
				expect(t).not.toContain('is a suburb');
			});
		});

		it('names other mapped things by what they are', () => {
			expect(text(scene({ beats: [beat('node/9', { natural: 'tree' })] }))).toContain('is a tree.');
			expect(text(scene({ beats: [beat('node/10', { traffic_calming: 'hump' })] }))).toContain(
				'is a speed hump.'
			);
		});

		it('calls a point with only an address an address', () => {
			expect(
				text(
					scene({
						beats: [beat('node/11', { 'addr:housenumber': '223a', 'addr:street': 'Everton Road' })]
					})
				)
			).toContain('is an address at 223a Everton Road.');
		});

		it('says right here without a comma', () => {
			const here = {
				subject: 'node/12',
				facts: facts('node/12', { amenity: 'bench' }),
				effects: []
			};
			expect(text(scene({ beats: [here] }))).toContain('Right here is a bench.');
		});

		it('gives another account’s date of beginning as a reader would say it', () => {
			const begun = (inception: string) =>
				text(
					scene({ beats: [beat('node/9', { amenity: 'pub', 'wikidata:inception': inception })] })
				);
			expect(begun('1868')).toContain('Elsewhere it is said to have begun in 1868.');
			expect(begun('1868-05')).toContain('begun in May 1868.');
			expect(begun('1868-05-01')).toContain('begun on 1 May 1868.');
		});

		it('speaks by another account only of Wikidata’s own items, never of half a thing', () => {
			const half = {
				subject: 'way/7',
				facts: facts(
					'way/7',
					{ 'wikidata:description': 'street in an invented borough' },
					north(20)
				).map((f) => ({ ...f, source: 'wikidata' })),
				effects: []
			};
			const t = text(scene({ beats: [half] }));
			expect(t).not.toMatch(/they say|it is said|someone wrote down/);
			expect(t).not.toContain('undefined');
		});

		it('finds by looking closer what only another account places here, by its name', () => {
			const works = {
				subject: 'wikidata/Q900000003',
				facts: facts(
					'wikidata/Q900000003',
					{ 'wikidata:label': 'The Old Invented Works' },
					north(5)
				).map((f) => ({ ...f, source: 'wikidata' })),
				effects: []
			};
			const room = renderer.render(scene({ hidden: [works] }));
			expect(room.hidden?.lines[0]).toContain(
				`“The Old Invented Works”, ${aside('“The Old Invented Works”')}`
			);
		});

		it('speaks a broken name as found without remarking on it', () => {
			const t = text(
				scene({
					beats: [
						beat('way/2', { building: 'retail', old_name: 'est Bank' }, {}, ['spoken-as-found'])
					]
				})
			);
			expect(t).toContain('“est Bank”');
			expect(t).not.toMatch(/as written|whole of it/);
		});

		it('tells what has gone from an address once, with what stands there now', () => {
			const now = facts(
				'way/3',
				{
					building: 'retail',
					'addr:housenumber': '9',
					old_name: 'est Bank',
					'disused:amenity': 'bank'
				},
				north(5)
			);
			const was = facts(
				'node/9',
				{ 'was:amenity': 'bank', 'was:name': 'Invented Bank', 'was:addr:housenumber': '9' },
				{ ...north(5), source: 'osm-history', observed: '2021-01-01' }
			);
			const t = text(
				scene({
					beats: [
						{ subject: 'way/3', facts: [...now, ...was], effects: ['spoken-as-found', 'was-here'] }
					]
				})
			);
			expect(t).toContain('It was a bank, “Invented Bank” in January 2021, and once “est Bank”.');
			expect(t.match(/bank/gi)).toHaveLength(3);
			expect(t).not.toContain('there was a bank');
		});

		it('gives a street once in a room, then only numbers', () => {
			const t = text(
				scene({
					beats: [
						beat('node/2', {
							shop: 'bakery',
							'addr:housenumber': '21',
							'addr:street': 'Everton Road'
						}),
						beat('node/3', {
							shop: 'florist',
							'addr:housenumber': '23',
							'addr:street': 'Everton Road'
						})
					]
				})
			);
			expect(t).toContain('a bakery at 21 Everton Road');
			expect(t).toContain('a florist at 23.');
		});

		it('says a second thing last recorded in the same month without the whole formula again', () => {
			const t = text(
				scene({
					beats: [
						beat(
							'node/2',
							{ shop: 'bakery', 'addr:housenumber': '21' },
							{ observed: '2018-10-04' },
							['tense-slip']
						),
						beat(
							'node/3',
							{ shop: 'florist', 'addr:housenumber': '23' },
							{ observed: '2018-10-04' },
							['tense-slip']
						)
					]
				})
			);
			expect(t.match(/when it was last recorded/g)).toHaveLength(1);
			expect(t).toContain('a florist at 23, or there was, then too.');
		});

		it('writes each paragraph as labelled parts, for the game to leave out what was just said', () => {
			const room = renderer.render(
				scene({
					beats: [beat('node/2', { amenity: 'pub', name: 'The Sextant' })],
					here: ['Everton Road']
				})
			);
			expect(room.parts?.map((p) => p.map((x) => x.text).join(' '))).toEqual(room.paragraphs);
			expect(room.parts?.[0].map((x) => x.kind)).toEqual(['where', 'street', 'street', 'street']);
			expect(room.parts?.[0][0].street).toBe('Everton Road');
			expect(room.parts?.[1]).toEqual([expect.objectContaining({ kind: 'thing', key: 'node/2' })]);
		});

		it('knows the one street underfoot where only a nameless path meets it', () => {
			const room = renderer.render(
				scene({
					kind: 'junction',
					here: ['Everton Road'],
					exits: [
						{ label: 'east', to: 'a', street: 'Everton Road' },
						{ label: 'west', to: 'b', street: 'Everton Road' },
						{ label: 'south', to: 'c' }
					]
				})
			);
			expect(room.parts?.[0][0].street).toBe('Everton Road');
		});

		it('hears the same setting in any order', () => {
			const two = (first: number, second: number) =>
				renderer
					.render(
						scene({
							beats: [
								{
									subject: 'way/8',
									facts: facts(
										'way/8',
										{ landuse: 'retail' },
										{ geometry: [destination(O, first, 20)] }
									),
									effects: []
								},
								{
									subject: 'way/9',
									facts: facts(
										'way/9',
										{ landuse: 'residential' },
										{ geometry: [destination(O, second, 25)] }
									),
									effects: []
								}
							].sort(() => (first > second ? -1 : 1))
						})
					)
					.parts![0].find((x) => x.kind === 'setting')!.key;
			expect(two(0, 180)).toBe(two(180, 0));
		});

		it('tells the setting by what it names, not by where it lies, so it is heard as the same', () => {
			const area = (bearing: number) =>
				renderer
					.render(
						scene({
							beats: [
								{
									subject: 'way/9',
									facts: facts(
										'way/9',
										{ landuse: 'residential' },
										{ geometry: [destination(O, bearing, 20)] }
									),
									effects: []
								}
							]
						})
					)
					.parts![0].find((x) => x.kind === 'setting')!.key;
			expect(area(0)).toBe(area(180));
		});

		it('tells things in the order they lie along the street underfoot, not nearest first', () => {
			const along = (metres: number, number: string) => ({
				subject: `node/${number}`,
				facts: facts(
					`node/${number}`,
					{ shop: 'bakery', 'addr:housenumber': number, 'addr:street': 'Everton Road' },
					{ geometry: [destination(destination(O, 90, metres), 0, 8)] }
				),
				effects: []
			});
			const street = facts(
				'way/1',
				{ highway: 'residential', name: 'Everton Road' },
				{ geometry: [destination(O, 270, 100), destination(O, 90, 100)] }
			);
			const t = text(scene({ street, beats: [along(5, '23'), along(-20, '21'), along(25, '25')] }));
			expect(t.indexOf('21')).toBeLessThan(t.indexOf('23'));
			expect(t.indexOf('23')).toBeLessThan(t.indexOf('25'));
		});

		it('reads a parade upwards, whichever way the street was drawn', () => {
			const along = (metres: number, number: string) => ({
				subject: `node/${number}`,
				facts: facts(
					`node/${number}`,
					{ shop: 'bakery', 'addr:housenumber': number, 'addr:street': 'Everton Road' },
					{ geometry: [destination(destination(O, 90, metres), 0, 8)] }
				),
				effects: []
			});
			const drawnWestward = facts(
				'way/1',
				{ highway: 'residential', name: 'Everton Road' },
				{ geometry: [destination(O, 90, 100), destination(O, 270, 100)] }
			);
			const t = text(
				scene({ street: drawnWestward, beats: [along(5, '23'), along(-20, '21'), along(25, '25')] })
			);
			expect(t.indexOf('21')).toBeLessThan(t.indexOf('23'));
			expect(t.indexOf('23')).toBeLessThan(t.indexOf('25'));
		});

		it('orders things along a street cut into short ways, by the street’s heading here', () => {
			const along = (metres: number, number: string) => ({
				subject: `node/${number}`,
				facts: facts(
					`node/${number}`,
					{ shop: 'bakery', 'addr:housenumber': number, 'addr:street': 'Everton Road' },
					{ geometry: [destination(destination(O, 90, metres), 0, 8)] }
				),
				effects: []
			});
			const stub = facts(
				'way/1',
				{ highway: 'residential', name: 'Everton Road' },
				{ geometry: [destination(O, 270, 3), destination(O, 90, 3)] }
			);
			const t = text(
				scene({
					street: stub,
					beats: [along(15, '25'), along(25, '27'), along(-20, '21'), along(5, '23')]
				})
			);
			expect(t.match(/at (\d+)/g)).toEqual(['at 21', 'at 23', 'at 25', 'at 27']);
		});

		it('at a junction, orders things along the street they are addressed to', () => {
			const along = (metres: number, number: string) => ({
				subject: `node/${number}`,
				facts: facts(
					`node/${number}`,
					{ shop: 'bakery', 'addr:housenumber': number, 'addr:street': 'Parade Road' },
					{ geometry: [destination(destination(O, 90, metres), 0, 8)] }
				),
				effects: []
			});
			const street = [
				...facts(
					'way/1',
					{ highway: 'residential', name: 'Everton Road' },
					{
						geometry: [destination(O, 0, 100), O]
					}
				),
				...facts(
					'way/2',
					{ highway: 'primary', name: 'Parade Road' },
					{
						geometry: [destination(O, 90, 100), destination(O, 270, 100)]
					}
				)
			];
			const t = text(
				scene({
					kind: 'junction',
					here: ['Everton Road', 'Parade Road'],
					street,
					beats: [along(5, '29'), along(-10, '27'), along(20, '31')]
				})
			);
			expect(t.match(/at (\d+)/g)).toEqual(['at 27', 'at 29', 'at 31']);
		});

		it('tells what another source says of a thing only it has', () => {
			const chapel = {
				subject: 'listed/42',
				facts: facts(
					'listed/42',
					{
						'listed:name': 'Invented Chapel',
						'listed:description': 'listed building',
						'listed:grade': 'II'
					},
					north(5)
				).map((f) => ({ ...f, source: 'Historic England', elsewhere: true as const })),
				effects: []
			};
			const t = text(scene({ beats: [chapel] }));
			expect(t).toContain(
				`, ${aside('“Invented Chapel”, “listed building”')}, is “Invented Chapel”, “listed building”. Listed, grade II.`
			);
		});

		it('tells a bench only another account has, by its inscription as found', () => {
			const bench = {
				subject: 'bench/7',
				facts: facts(
					'bench/7',
					{ 'bench:kind': 'bench', 'bench:inscription': 'For Ada Inventa, who sat here' },
					north(5)
				).map((f) => ({ ...f, source: 'OpenBenches', elsewhere: true as const })),
				effects: []
			};
			const t = text(scene({ beats: [bench] }));
			expect(t).toContain(
				`, ${aside('a bench')}, is a bench. On it: “For Ada Inventa, who sat here”.`
			);
			expect(t).not.toContain('undefined');
		});

		it('lets a bench only another account has be examined as a bench', () => {
			const bench = {
				subject: 'bench/7',
				facts: facts(
					'bench/7',
					{ 'bench:kind': 'bench', 'bench:inscription': 'For Ada Inventa' },
					north(5)
				).map((f) => ({ ...f, source: 'OpenBenches', elsewhere: true as const })),
				effects: []
			};
			const room = new AdventureRenderer().render(scene({ beats: [bench] }));
			const found = [...room.things, ...(room.hidden?.things ?? [])].find(
				(t) => t.id === 'bench/7'
			)!;
			expect(found.name).toBe('bench');
			expect(found.aliases).toContain('bench');
			expect(found.description).toBe(
				'A bench. The map does not have it. On it: “For Ada Inventa”.'
			);
		});

		it('gives a kind it was given as a kind, not as the account’s own words', () => {
			const postcode = {
				subject: 'postcode/CR0 9ZZ',
				facts: facts(
					'postcode/CR0 9ZZ',
					{
						'postcode:name': 'CR0 9ZZ',
						'postcode:kind': 'postcode',
						'postcode:began': '1980-01',
						'postcode:ended': '1998-06'
					},
					north(5)
				).map((f) => ({ ...f, source: 'Another Source', elsewhere: true as const })),
				effects: []
			};
			expect(text(scene({ beats: [postcode] }))).toContain(
				`, ${aside('“CR0 9ZZ”, a postcode')}, is “CR0 9ZZ”, a postcode. In use from January 1980 to June 1998.`
			);
		});

		it('tells the inscription on a bench the map has', () => {
			const bench = {
				subject: 'node/7',
				facts: [
					...facts('node/7', { amenity: 'bench' }, north(5)),
					...facts(
						'node/7',
						{ 'bench:kind': 'bench', 'bench:inscription': 'For Ada Inventa' },
						north(5)
					).map((f) => ({ ...f, source: 'OpenBenches', elsewhere: true as const }))
				],
				effects: []
			};
			expect(text(scene({ beats: [bench] }))).toContain('On it: “For Ada Inventa”.');
		});

		it('tells a disused use in the past tense', () => {
			const t = text(scene({ beats: [beat('way/2', { 'disused:amenity': 'bank' })] }));
			expect(t).toMatch(/was a bank/);
		});

		it('slips between present and past for a dated feature', () => {
			const t = text(
				scene({
					beats: [
						beat(
							'node/3',
							{ shop: 'bakery', 'addr:housenumber': '225' },
							{ observed: '2018-10-04' },
							['tense-slip']
						)
					]
				})
			);
			expect(t).toContain(
				'there is a bakery at 225, or there was in October 2018, when it was last recorded.'
			);
			expect(t.match(/bakery/g)).toHaveLength(1);
		});

		it('gives uncountable things no article', () => {
			expect(text(scene({ beats: [beat('node/4', { amenity: 'bicycle_parking' })] }))).toContain(
				'is bicycle parking.'
			);
		});

		it('describes a bus stop by its name', () => {
			expect(
				text(scene({ beats: [beat('node/5', { highway: 'bus_stop', name: 'Weir Steps' })] }))
			).toContain('a bus stop, “Weir Steps”.');
		});

		it('hesitates when there is little to go on', () => {
			expect(text(scene({ mood: 'hesitant' }))).toMatch(/…|—/);
		});

		it('loses the thread when crowded', () => {
			const many = Array.from({ length: 9 }, (_, i) => beat(`node/${i}`, { amenity: 'bench' }));
			const crowded = scene({ mood: 'rambling', beats: many.slice(0, 2), hidden: many.slice(2) });
			expect(text(crowded)).toMatch(/lose count|stopped counting|lose the thread/);
		});

		describe('in a crowd', () => {
			const benches = Array.from({ length: 6 }, (_, i) => beat(`node/${i}`, { amenity: 'bench' }));
			const bank = beat('way/2', { building: 'retail', old_name: 'est Bank' }, {}, [
				'spoken-as-found'
			]);
			const pub = beat('node/9', { amenity: 'pub', name: 'The Sextant' });
			const kebab = beat('node/10', { amenity: 'fast_food', name: 'Brothers Kebab' });
			const chemist = beat('node/11', { amenity: 'pharmacy', name: 'Larchwood Pharmacy' });
			const room = renderer.render(
				scene({ mood: 'rambling', beats: [bank, pub], hidden: [kebab, chemist, ...benches] })
			);
			const crowd = room.paragraphs.join('\n\n');

			it('tells what is noticed in full sentences', () => {
				expect(crowd).toContain('To the north, a few steps away, is a retail building.');
				expect(crowd).toContain('Once “est Bank”.');
			});

			it('does not repeat a direction just given', () => {
				expect(crowd).toContain('Next to it is a pub, “The Sextant”.');
			});

			it('loses count of the rest, keeping them hidden', () => {
				expect(crowd).toMatch(/lose count|stopped counting|lose the thread/);
				expect(crowd).not.toContain('Brothers Kebab');
			});

			it('finds the rest on a closer look, named things by name and repeats counted', () => {
				expect(room.hidden?.lines[0]).toBe(
					'Looking closer, you find Brothers Kebab, a fast food place, and Larchwood Pharmacy, and six benches.'
				);
			});

			it('finds things only another account has by their name, or by their kind, never undefined', () => {
				const elsewhereOnly = (subject: string, tags: Record<string, string>) => ({
					subject,
					facts: facts(subject, tags, north(10)).map((f) => ({
						...f,
						source: 'Another Source',
						elsewhere: true as const
					})),
					effects: []
				});
				const found = renderer.render(
					scene({
						mood: 'rambling',
						beats: [bank, pub],
						hidden: [
							elsewhereOnly('bench/1', { 'bench:kind': 'bench', 'bench:inscription': 'For Ada' }),
							elsewhereOnly('listed/2', { 'listed:name': 'Invented Chapel' })
						]
					})
				).hidden?.lines[0];
				expect(found).toContain(`a bench, ${aside('a bench')}`);
				expect(found).toContain(`“Invented Chapel”, ${aside('“Invented Chapel”')}`);
				expect(found).not.toContain('undefined');
			});

			it('lets hidden things be examined once found', () => {
				expect(room.hidden?.things.map((t) => t.name)).toContain('Brothers Kebab');
				expect(room.things.map((t) => t.name)).not.toContain('Brothers Kebab');
			});
		});

		it('points to nothing when things are hidden on a quiet stop', () => {
			const room = renderer.render(
				scene({
					beats: [beat('node/2', { amenity: 'pub' })],
					hidden: [beat('node/3', { amenity: 'bench' })]
				})
			);
			expect(room.paragraphs.slice(0, -1).join(' ')).not.toMatch(/more here|could not say|look/i);
			expect(room.hidden?.lines[0]).toContain('bench');
		});

		it('says the same thing at the same stop every time', () => {
			expect(text(scene({ mood: 'hesitant' }))).toBe(text(scene({ mood: 'hesitant' })));
		});
	});

	describe('history', () => {
		const history = { ...north(15), source: 'osm-history', observed: '2017-01-01' };
		const gone = {
			subject: 'node/7',
			facts: facts('node/7', { 'was:shop': 'bakery', 'was:name': 'Crumb' }, history),
			effects: ['remembered' as const]
		};
		const renamed = {
			subject: 'node/8',
			facts: [
				...facts('node/8', { amenity: 'pub', name: 'The Sextant' }, north(15)),
				...facts('node/8', { 'was:name': 'The Anchor' }, history)
			],
			effects: ['self-correction' as const]
		};

		it('remembers what has gone, in the past tense, dated', () => {
			const t = text(scene({ beats: [gone] }));
			expect(t).toContain(
				'To the north, a few steps away, there was a bakery, “Crumb”, in January 2017. The map no longer has it.'
			);
		});

		it('corrects itself between a name and an older one', () => {
			expect(text(scene({ beats: [renamed] }))).toContain(
				'“The Sextant”, or “The Anchor”, as it was in January 2017.'
			);
		});

		it('lets what has gone be examined by its old name', () => {
			const [thing] = renderer.render(scene({ beats: [gone] })).things;
			expect(thing.aliases).toEqual(expect.arrayContaining(['crumb', 'bakery']));
			expect(thing.description).toContain('There was a bakery, “Crumb”. The map no longer has it.');
			expect(thing.description).toContain('Last recorded in January 2017.');
			expect(thing.description).not.toContain('=');
		});

		it('names what has gone by its old name when it is found on a closer look', () => {
			const room = renderer.render(scene({ beats: [], hidden: [gone] }));
			expect(room.hidden?.lines[0]).toContain('Crumb');
		});
	});

	describe('ways on', () => {
		it('lists exits with where they lead', () => {
			const t = text(
				scene({
					exits: [
						{ label: 'east', to: 'a', street: 'Everton Road', towards: 'Clyde Road' },
						{ label: 'west', to: 'b', street: 'Everton Road', towards: 'a dead end' }
					]
				})
			);
			expect(t).toContain(
				'Exits: east (Everton Road, towards Clyde Road); west (Everton Road, a dead end).'
			);
		});
	});

	describe('the street to examine', () => {
		it('offers the street underfoot to examine, in words', () => {
			const room = renderer.render(scene());
			expect(room.streets).toEqual([
				expect.objectContaining({
					name: 'Everton Road',
					aliases: expect.arrayContaining(['everton', 'road', 'street', 'here'])
				})
			]);
			const [street] = room.streets!;
			expect(street.description).toContain('Everton Road. Asphalt underfoot.');
			expect(street.description).not.toContain('=');
		});

		it('tells, on examining a street, what other sources say of it', () => {
			const crime = facts('way/1', {
				'crime:month': '2026-08',
				'crime:reports': '2',
				'crime:kinds': 'burglary (2)'
			}).map((f) => ({ ...f, source: 'police.uk', elsewhere: true as const }));
			const [street] = renderer.render(scene({ street: [...everton, ...crime] })).streets!;
			expect(street.description).toContain(
				'In August 2026, 2 reports on or near it: burglary (2).'
			);
		});

		it('offers only the streets that meet here, not those merely in view', () => {
			const nearby = facts('way/5', { highway: 'residential', name: 'Clyde Road' });
			const room = renderer.render(scene({ street: [...everton, ...nearby] }));
			expect(room.streets?.map((s) => s.name)).toEqual(['Everton Road']);
		});

		it('marks the setting, so it is not offered as a thing', () => {
			const land = {
				subject: 'way/9',
				facts: facts('way/9', { landuse: 'residential' }, north(20)),
				effects: []
			};
			expect(renderer.render(scene({ beats: [land] })).things[0].background).toBe(true);
		});
	});

	describe('things to examine', () => {
		it('offers each feature with words to call it by', () => {
			const [thing] = renderer.render(
				scene({
					beats: [beat('node/2', { amenity: 'pub', name: 'The Sextant', 'addr:housenumber': '21' })]
				})
			).things;
			expect(thing.name).toBe('The Sextant');
			expect(thing.aliases).toEqual(expect.arrayContaining(['sextant', 'pub', '21']));
		});

		it('shows the map’s own record when examined', () => {
			const [thing] = renderer.render(
				scene({
					beats: [
						beat(
							'node/2',
							{ amenity: 'pub', name: 'The Sextant' },
							{ observed: '2023-04-01', observedBy: 'edit' }
						)
					]
				})
			).things;
			expect(thing.description).toContain('A pub, “The Sextant”.');
			expect(thing.description).toContain('Last edited in April 2023.');
			expect(thing.description).not.toContain('=');
		});

		it('says what the map knows of a thing in words, never its raw record', () => {
			const [thing] = renderer.render(
				scene({
					beats: [
						beat('node/2', {
							amenity: 'fast_food',
							name: 'Invented Kebab',
							cuisine: 'kebab;pizza',
							takeaway: 'yes',
							'fhrs:id': '123456',
							'addr:city': 'Inventon'
						})
					]
				})
			).things;
			expect(thing.description).toContain('It serves kebab and pizza. Takeaway.');
			expect(thing.description).not.toMatch(/=|fhrs|123456|Inventon/);
		});
	});
});
