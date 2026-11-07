import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import type { Scene } from '../scene';
import { facts } from '../testing/facts';
import { SyntheticMap } from '../testing/synthetic';
import { arrowOf, comingTo, easyRead, PICTURES } from './easyread';

// Invented places and things: no real place.
const O = SyntheticMap.ORIGIN;
const road = facts('way/1', { highway: 'residential', name: 'Inventa Road', lit: 'yes' });
const scene = (s: Partial<Scene> = {}): Scene => ({
	stopId: 's1',
	street: road,
	beats: [],
	hidden: [],
	mood: 'plain',
	position: O,
	kind: 'corridor',
	here: ['Inventa Road'],
	exits: [
		{ label: 'north', to: 'a', street: 'Inventa Road' },
		{ label: 'south', to: 'b' }
	],
	...s
});
const thing = (subject: string, tags: Record<string, string>, metres = 10) => ({
	subject,
	facts: facts(subject, tags, { geometry: [destination(O, 0, metres)] }),
	effects: []
});
const texts = (s: Scene) => easyRead(s).map((l) => l.text);

describe('easyRead', () => {
	it('says where you are in one short sentence, with a picture', () => {
		const [first] = easyRead(scene());
		expect(first).toEqual({ text: 'You are on Inventa Road.', picture: PICTURES.where });
	});

	it('says what is here, one thing to a line, its name as the map gives it', () => {
		const s = scene({
			beats: [
				thing('node/1', { amenity: 'pub', name: 'The Invented Arms' }),
				thing('node/2', { shop: 'bakery', name: 'Inventa Bakes' }, 20)
			]
		});
		expect(texts(s)).toContain('There is a pub here. It is called The Invented Arms.');
		expect(texts(s)).toContain('There is a bakery here. It is called Inventa Bakes.');
		expect(easyRead(s).find((l) => l.text.includes('pub'))?.picture).toBe(PICTURES.pub);
	});

	it('counts things of one kind with no name, and leaves out what it cannot say plainly', () => {
		const s = scene({
			beats: [
				thing('way/2', { building: 'house' }),
				thing('way/3', { building: 'house' }),
				thing('way/4', { building: 'house' }),
				thing('node/5', { shop: 'convenience', name: 'est Bank' }),
				thing('node/6', { man_made: 'manhole' })
			]
		});
		expect(texts(s)).toContain('There are 3 houses here.');
		expect(texts(s).join(' ')).not.toMatch(/est Bank|manhole/);
	});

	it('tells at most four things, nearest first', () => {
		const s = scene({
			beats: ['A', 'B', 'C', 'D', 'E'].map((n, i) =>
				thing(`node/${i}`, { amenity: 'pub', name: `The Invented ${n}` }, 10 + i)
			)
		});
		expect(texts(s).filter((t) => t.startsWith('There is'))).toHaveLength(4);
		expect(texts(s).join(' ')).not.toContain('The Invented E');
	});

	it('says which ways you can go, one to a line, each a button with its arrow', () => {
		const lines = easyRead(scene());
		expect(lines.slice(-3).map((l) => l.text)).toEqual([
			'You can go:',
			'North. Along Inventa Road.',
			'South. Along a path.'
		]);
		expect(lines.at(-3)?.picture).toBe(PICTURES.ways);
		expect(lines.at(-2)?.go).toEqual({ to: 'a', arrow: 0 });
		expect(lines.at(-1)?.go).toEqual({ to: 'b', arrow: 180 });
	});

	it('says what each way comes to, from the next place itself', () => {
		const ahead = { a: { names: ['Inventa tram stop'] }, b: { names: [], end: true } };
		const lines = easyRead(scene(), (to) => ahead[to as 'a' | 'b']);
		expect(lines.slice(-2).map((l) => l.text)).toEqual([
			'North. Along Inventa Road. You will come to Inventa tram stop.',
			'South. Along a path. The path ends there.'
		]);
	});

	it('says nothing more of a way that comes only to more of the same street', () => {
		const lines = easyRead(scene(), () => ({ names: ['Inventa Road'] }));
		expect(lines.at(-2)?.text).toBe('North. Along Inventa Road.');
	});

	it('turns each arrow to the way it names, of sixteen points', () => {
		expect(arrowOf('north-east')).toBe(45);
		expect(arrowOf('west-south-west')).toBe(247.5);
		expect(arrowOf('north-east (Inventa Road)')).toBe(45);
	});

	it('tells what a place is to someone coming to it: its tram stop, its streets, then its named things', () => {
		const stop = thing('node/8', { railway: 'tram_stop', name: 'Inventa' });
		const pub = thing('node/1', { amenity: 'pub', name: 'The Invented Arms' });
		expect(comingTo(scene({ beats: [stop] })).names[0]).toBe('Inventa tram stop');
		expect(comingTo(scene({ beats: [pub], here: ['Inventa Road', 'Other Lane'] })).names).toEqual([
			'Inventa Road',
			'Other Lane',
			'The Invented Arms'
		]);
		expect(comingTo(scene({ here: [] })).names).toEqual([]);
		expect(comingTo(scene({ kind: 'junction', exits: [{ label: 'south', to: 'b' }] })).end).toBe(
			true
		);
	});

	it('names only what is new on a way, never a thing already here', () => {
		const pub = thing('node/1', { amenity: 'pub', name: 'The Invented Arms' });
		const s = scene({ beats: [pub] });
		const lines = easyRead(s, () => ({
			names: ['Inventa Road', 'The Invented Arms', 'Other Lane']
		}));
		expect(lines.at(-2)?.text).toBe('North. Along Inventa Road. You will come to Other Lane.');
	});

	it('says you are in a suburb the map names, rather than that one is here', () => {
		const s = scene({
			beats: [
				thing('node/1', { amenity: 'pub', name: 'The Invented Arms' }),
				thing('node/9', { place: 'suburb', name: 'Inventon' })
			]
		});
		expect(texts(s)[1]).toBe('You are in Inventon.');
		expect(texts(s).join(' ')).not.toContain('suburb');
	});

	it('says plainly when a way ends', () => {
		const s = scene({
			kind: 'junction',
			exits: [{ label: 'south', to: 'b', street: 'Inventa Road' }]
		});
		expect(texts(s)[0]).toBe('You are at the end of Inventa Road.');
		expect(texts(s)).toContain('You can only go back: south.');
	});

	it('says trams run here for a tram line, not that a tram is here', () => {
		const s = scene({
			beats: [thing('way/7', { railway: 'tram', name: 'Invented Trams (Line)' })]
		});
		expect(texts(s)).toContain('Trams run here.');
		expect(texts(s).join(' ')).not.toContain('Invented Trams');
	});

	it('reads the words on a plaque as they are', () => {
		const s = scene({
			beats: [
				{
					subject: 'plaque/1',
					facts: facts(
						'plaque/1',
						{ 'plaque:inscription': 'Ada Inventa lived here' },
						{
							geometry: [destination(O, 0, 10)],
							elsewhere: true
						}
					),
					effects: []
				}
			]
		});
		expect(texts(s)).toContain('There is a plaque here. It says: “Ada Inventa lived here”.');
		expect(easyRead(s).find((l) => l.text.includes('plaque'))?.picture).toBe(PICTURES.plaque);
	});

	it('uses everyday words for a kind of place', () => {
		const s = scene({
			beats: [
				thing('way/1', { landuse: 'retail', name: 'Inventa Parade' }),
				thing('node/2', { shop: 'bookmaker', name: 'Invented Bets' }, 12)
			]
		});
		expect(texts(s)).toContain('There is a shopping area here. It is called Inventa Parade.');
		expect(texts(s)).toContain('There is a betting shop here. It is called Invented Bets.');
	});

	it('calls a tram platform by its tram stop', () => {
		const platform = facts('way/9', {
			railway: 'platform',
			public_transport: 'platform',
			tram: 'yes'
		});
		const s = scene({
			street: platform,
			here: [],
			kind: 'junction',
			beats: [
				thing('node/8', { railway: 'tram_stop', name: 'Inventa', tram: 'yes' }, 8),
				thing('way/10', { railway: 'platform', tram: 'yes' }, 2)
			]
		});
		expect(easyRead(s)[0]).toEqual({
			text: 'You are at Inventa tram stop.',
			picture: PICTURES.tram
		});
		// At the tram stop, its platform and its own name are not told again as things here.
		expect(texts(s).join(' ')).not.toMatch(/platform|called Inventa/);
	});
});
