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
	it('tells a step onto ground a mine was drawn on: how many plans, of which mine, for what', () => {
		expect(zoneLines([plans('INVENTED GILL')], [])).toEqual([
			hearsay('this ground was drawn on three mine plans of INVENTED GILL, for lead and zinc')
		]);
		expect(zoneLines([plans('INVENTED GILL', { plans: '1', abandoned: '1901' })], [])).toEqual([
			hearsay(
				'this ground was drawn on a mine plan of INVENTED GILL, for lead and zinc, abandoned in 1901'
			)
		]);
	});

	it('gives what a mine raised, year by year, as the returns give it', () => {
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
			hearsay(
				'of Invented Gill, the returns for 1871 give 2 tons 3 cwts of lead ore, 1 ton 10 cwts of lead and 40 ounces of silver'
			),
			hearsay('of Invented Gill, the returns for 1872 give 5 tons of lead ore')
		]);
	});

	it('gives copper sold at the ticketings as the returns give it: ore, fine copper, what it sold for', () => {
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
			hearsay(
				'of South Huel Inventa, the returns for 1872 give 2,654 tons of copper ore, 219 tons 3 cwts 2 qrs 27 lbs of copper, sold for £17,428'
			)
		]);
	});

	it('tells the rock beneath on coming onto it, its name as found, its words read as words', () => {
		const rock: Zone = {
			name: 'INVENTED GROUP',
			kind: 'bedrock',
			claims: { rock: 'LIMESTONE WITH SUBORDINATE SANDSTONE', age: 'ASBIAN to YEADONIAN' }
		};
		expect(zoneLines([rock], [])).toEqual([
			hearsay(
				'beneath you lies INVENTED GROUP: limestone with subordinate sandstone, of the Asbian to Yeadonian'
			)
		]);
	});

	it('reads a mineral as a word, and says a rock once when its name is what it is', () => {
		expect(zoneLines([plans('INVENTED GILL', { minerals: 'LEAD and ZINC' })], [])).toEqual([
			hearsay('this ground was drawn on three mine plans of INVENTED GILL, for lead and zinc')
		]);
		const peat: Zone = { name: 'PEAT', kind: 'superficial deposits', claims: { rock: 'PEAT' } };
		expect(zoneLines([peat], [])).toEqual([hearsay('beneath you lies PEAT')]);
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

	it('tells three mines at most in one step, and how many more the ground was drawn for', () => {
		const lines = zoneLines(
			['A', 'B', 'C', 'D', 'E'].map((n) => plans(`INVENTED ${n}`)),
			[]
		);
		expect(lines).toHaveLength(4);
		expect(lines[3]).toBe(hearsay('the ground was drawn for two mines more'));
	});
});
