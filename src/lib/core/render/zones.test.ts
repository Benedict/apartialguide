import { describe, expect, it } from 'vitest';
import { hearsay } from './hearsay';
import { zoneLines, type Zone } from './zones';

// Invented mines and rocks: no real place.
const plans = (name: string, claims: Record<string, string> = {}): Zone => ({
	name,
	kind: 'mine plans',
	claims: { plans: '3', kinds: 'mine plan', minerals: 'lead and zinc', ...claims }
});
const flood: Zone = { name: 'Invented Zone 3', kind: 'flood zone' };

describe('zoneLines', () => {
	it('tells a step onto ground old mine plans cover: how many, of which mine, worked for what', () => {
		expect(zoneLines([plans('INVENTED GILL')], [])).toEqual([
			'The plans of old mines cover this ground: three of “Invented Gill”, worked for lead and zinc.'
		]);
		expect(
			zoneLines([plans('INVENTED GILL, OTHER PARK', { plans: '1', abandoned: '1901' })], [])
		).toEqual([
			'The plans of old mines cover this ground: one of “Invented Gill, Other Park”, worked for lead and zinc, abandoned in 1901.'
		]);
	});

	it('gives what a mine raised, year by year, as the returns give it, the name as the returns spell it', () => {
		const returns: Zone = {
			name: 'Invented Gill',
			kind: 'mine returns',
			claims: {
				'1871.ore': '2 tons 3 cwts',
				'1871.lead': '1 ton 10 cwts',
				'1871.silver': '40',
				'1872.ore': '5 tons'
			}
		};
		expect(zoneLines([returns], [])).toEqual([
			'What “Invented Gill” raised in 1871, by the returns: 2 tons 3 cwts of lead ore, 1 ton 10 cwts of lead and 40 ounces of silver.',
			'What “Invented Gill” raised in 1872, by the returns: 5 tons of lead ore.'
		]);
	});

	it('gives copper sold at the ticketings: ore, fine copper, what it sold for', () => {
		const returns: Zone = {
			name: 'South Huel Inventa',
			kind: 'mine returns',
			claims: {
				'1872.copper ore': '2,654 tons',
				'1872.copper': '219 tons 3 cwts 2 qrs 27 lbs',
				'1872.pounds': '17,428'
			}
		};
		expect(zoneLines([returns], [])).toEqual([
			'What “South Huel Inventa” raised in 1872, by the returns: 2,654 tons of copper ore, holding 219 tons 3 cwts 2 qrs 27 lbs of copper, sold for £17,428.'
		]);
	});

	it('tells the rock beneath in plain words, and when it was laid down by the geological time scale', () => {
		const rock: Zone = {
			name: 'INVENTED GROUP',
			kind: 'bedrock',
			claims: {
				rock: 'LIMESTONE WITH SUBORDINATE SANDSTONE AND ARGILLACEOUS ROCKS',
				age: 'ASBIAN to YEADONIAN'
			}
		};
		expect(zoneLines([rock], [])).toEqual([
			'Under your feet, the map of the rocks shows the Invented Group: limestone, with some sandstone and mudstone, laid down in the Carboniferous, between 359 and 299 million years ago.'
		]);
	});

	it('says a rock once when its name is what it is, and an age it cannot place not at all', () => {
		const peat: Zone = {
			name: 'PEAT',
			kind: 'superficial deposits',
			claims: { rock: 'PEAT', age: 'UNKNOWN AGE' }
		};
		expect(zoneLines([peat], [])).toEqual(['Under your feet, the map of the rocks shows peat.']);
		const till: Zone = {
			name: 'TILL',
			kind: 'superficial deposits',
			claims: { rock: 'DIAMICTON', age: 'DEVENSIAN' }
		};
		expect(zoneLines([till], [])).toEqual([
			'Under your feet, the map of the rocks shows till: boulder clay, laid down in the Quaternary, in the last 2.6 million years.'
		]);
	});

	it('says nothing of coming off a mine’s ground or a rock, and still says leaving a flood zone', () => {
		const rock: Zone = { name: 'INVENTED GROUP', kind: 'bedrock', claims: { rock: 'SANDSTONE' } };
		expect(zoneLines([], [plans('INVENTED GILL'), rock, flood])).toEqual([
			hearsay('you have come out of Invented Zone 3')
		]);
	});

	it('keeps the old telling for any other zone', () => {
		expect(zoneLines([flood], [])).toEqual([
			hearsay('you are within Invented Zone 3, a flood zone')
		]);
	});

	it('tells three mines at most in one step, in one sentence, and how many more the plans cover', () => {
		const lines = zoneLines(
			['A', 'B', 'C', 'D', 'E'].map((n) => plans(`INVENTED ${n}`)),
			[]
		);
		expect(lines).toHaveLength(1);
		expect(lines[0].match(/The plans of old mines/g)).toHaveLength(1);
		expect(lines[0]).toMatch(
			/^The plans of old mines cover this ground: .*“Invented A”.*; .*“Invented B”.*; and .*“Invented C”.*\. Plans of two more mines cover it too\.$/
		);
	});

	it('names single mines before a title that runs several together, which goes to the count', () => {
		const [line] = zoneLines(
			[
				plans('INVENTED NORTH INVENTED SOUTH INVENTED EAST INVENTED WEST'),
				plans('INVENTED A'),
				plans('INVENTED B'),
				plans('INVENTED C')
			],
			[]
		);
		expect(line).toContain('“Invented A”');
		expect(line).toContain('“Invented C”');
		expect(line).not.toContain('Invented North');
		expect(line).toContain('Plans of one more mine cover it too.');
	});

	it('joins two mines with and', () => {
		const [line] = zoneLines([plans('INVENTED A'), plans('INVENTED B')], []);
		expect(line).toMatch(/“Invented A”.*; and .*“Invented B”.*\.$/);
	});
});
