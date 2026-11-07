import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import type { Scene } from '../scene';
import { facts } from '../testing/facts';
import { SyntheticMap } from '../testing/synthetic';
import { easyRead, PICTURES } from './easyread';

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

	it('says which ways you can go, one to a line', () => {
		const lines = easyRead(scene());
		expect(lines.slice(-3).map((l) => l.text)).toEqual([
			'You can go:',
			'North, along Inventa Road.',
			'South, along a path.'
		]);
		expect(lines.at(-3)?.picture).toBe(PICTURES.ways);
	});

	it('says plainly when a way ends', () => {
		const s = scene({
			kind: 'junction',
			exits: [{ label: 'south', to: 'b', street: 'Inventa Road' }]
		});
		expect(texts(s)[0]).toBe('You are at the end of Inventa Road.');
		expect(texts(s)).toContain('You can only go back: south.');
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
			beats: [thing('node/8', { railway: 'tram_stop', name: 'Inventa', tram: 'yes' }, 8)]
		});
		expect(easyRead(s)[0]).toEqual({
			text: 'You are at Inventa tram stop.',
			picture: PICTURES.tram
		});
	});
});
