import { describe, expect, it } from 'vitest';
import { destination, type LatLon } from '../geo';
import type { Scene } from '../scene';
import { facts } from '../testing/facts';
import { SyntheticMap } from '../testing/synthetic';
import { AdventureRenderer } from './adventure';

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
			expect(t).toMatch(/there’s a bakery/i);
			expect(t).toMatch(/there was a bakery/i);
			expect(t).toContain('There was a bakery in October 2018, when it was last recorded.');
			expect(t.match(/at 225/g)).toHaveLength(1);
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
			expect(text(crowded)).toMatch(/I lose count/);
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
				expect(crowd).toContain('I lose count');
				expect(crowd).not.toContain('Brothers Kebab');
			});

			it('finds the rest on a closer look, named things by name and repeats counted', () => {
				expect(room.hidden?.lines[0]).toBe(
					'Looking closer, you find Brothers Kebab, a fast food place, and Larchwood Pharmacy, and six benches.'
				);
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
			expect(thing.description).toContain('was:shop=bakery');
			expect(thing.description).toContain('Last recorded in January 2017.');
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
			expect(thing.description).toContain('amenity=pub');
			expect(thing.description).toContain('Last edited in April 2023.');
		});
	});
});
