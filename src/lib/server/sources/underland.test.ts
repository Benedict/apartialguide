import { describe, expect, it } from 'vitest';
import { boreholeRecords, mineZones, returnZones, rockZones } from './underland';

// Invented mines, rocks and boreholes, in an invented square of ground: no real place.
type Ring = [number, number][];
const ring = (lat: number, lon: number, d = 0.002): Ring => [
	[lat + d, lon - d],
	[lat + d, lon + d],
	[lat - d, lon + d],
	[lat - d, lon - d],
	[lat + d, lon - d]
];
const plans = {
	source: 'British Geological Survey, index of mine plans',
	licence: 'Invented',
	retrieved: '2026-11-06',
	plans: [
		{
			id: '1',
			title: 'A',
			mine: 'INVENTED GILL',
			kind: 'mine plan',
			mineral: 'lead',
			ring: ring(54.7, -2.2)
		},
		{
			id: '2',
			title: 'B',
			mine: 'INVENTED GILL',
			kind: 'mine plan',
			mineral: 'zinc',
			abandoned: '1901',
			ring: ring(54.701, -2.2)
		},
		{ id: '3', title: 'C', mine: 'OTHER INVENTED', kind: 'section', ring: ring(54.72, -2.25) },
		// Filed for a whole sheet, about 25 km²: not of any ground in particular.
		{
			id: '4',
			title: 'D',
			mine: 'INVENTED SHEET',
			kind: 'mine plan',
			ring: ring(54.7, -2.2, 0.03)
		}
	]
};

describe('the mines’ records, for the walk', () => {
	it('makes each mine’s plans of the ground itself one zone: its plans counted, its minerals, its last year', () => {
		const store = mineZones(plans);
		expect(store).toMatchObject({ prefix: 'mine', overlay: true, retrieved: '2026-11-06' });
		const gill = store.areas!.find((a) => a.name === 'INVENTED GILL')!;
		expect(gill.kind).toBe('mine plans');
		expect(gill.rings).toHaveLength(2);
		expect(gill.claims).toEqual({
			plans: '2',
			kinds: 'mine plan',
			minerals: 'lead and zinc',
			abandoned: '1901'
		});
		expect(store.areas!.find((a) => a.name === 'OTHER INVENTED')!.claims).toEqual({
			plans: '1',
			kinds: 'section'
		});
		expect(store.areas!.map((a) => a.name)).not.toContain('INVENTED SHEET');
	});

	it('takes a plan’s title for its mine, as found, where the index names no mine', () => {
		const untitled = {
			...plans,
			plans: [
				{
					id: '7',
					title: 'INVENTED BAL',
					kind: 'mine plan',
					mineral: 'COPPER',
					ring: ring(50.2, -5.2)
				}
			]
		};
		expect(mineZones(untitled).areas!.map((a) => a.name)).toEqual(['INVENTED BAL']);
	});

	it('lays a mine’s returns over its ground, by its name read as a key, its figures as the returns give them', () => {
		const ledger = {
			source: 'Robert Hunt, Mineral Statistics',
			licence: 'Public domain',
			retrieved: '2026-11-07',
			returns: [
				{
					mine: 'Invented Gill',
					year: '1871',
					ore: { tons: 2, cwts: 3 },
					lead: { tons: 1, cwts: 0 },
					silver: 40
				},
				{
					mine: 'Nowhere Invented',
					year: '1871',
					ore: { tons: 9, cwts: 0 },
					lead: { tons: 6, cwts: 0 }
				}
			]
		};
		const store = returnZones(ledger, mineZones(plans));
		expect(store.areas).toHaveLength(1);
		expect(store.areas![0]).toMatchObject({ name: 'Invented Gill', kind: 'mine returns' });
		expect(store.areas![0].rings).toHaveLength(2);
		expect(store.areas![0].claims).toEqual({
			'1871.ore': '2 tons 3 cwts',
			'1871.lead': '1 ton',
			'1871.silver': '40'
		});
	});

	it('gives a mine’s returns to the mark of its name on the map, where no plans’ ground has it', () => {
		const ledger = {
			source: 'Robert Hunt, Mineral Statistics',
			licence: 'Public domain',
			retrieved: '2026-11-07',
			returns: [
				{
					mine: 'Invented Law',
					year: '1872',
					ore: { tons: 7, cwts: 0 },
					lead: { tons: 5, cwts: 1 }
				}
			]
		};
		const marks = {
			source: 'OpenStreetMap',
			licence: 'ODbL',
			retrieved: '2026-11-07',
			marks: [
				{
					ref: 'node/9',
					kind: 'mine shaft',
					name: 'Invented Law Shaft',
					at: [54.71, -2.21] as [number, number]
				},
				{
					ref: 'node/8',
					kind: 'mine',
					name: 'Invented Law',
					at: [54.7105, -2.21] as [number, number]
				}
			]
		};
		const store = returnZones(ledger, mineZones(plans), marks);
		expect(store.areas).toEqual([]);
		expect(store.standalone).toBe(false);
		expect(store.records).toEqual([
			{
				id: 'hunt-0',
				at: [54.7105, -2.21],
				near: { key: 'name', value: 'Invented Law', within: 15 },
				claims: { mine: 'Invented Law', '1872.ore': '7 tons', '1872.lead': '5 tons 1 cwts' }
			}
		]);
	});

	it('gives copper returns to a mine’s ground too, its Huel read as Wheal for the match alone', () => {
		const cornish = {
			...plans,
			plans: [
				{
					id: '9',
					title: 'Z',
					mine: 'SOUTH WHEAL INVENTA',
					kind: 'mine plan',
					ring: ring(50.2, -5.2)
				}
			]
		};
		const ledger = {
			source: 'Robert Hunt, Mineral Statistics',
			licence: 'Public domain',
			retrieved: '2026-11-08',
			returns: [],
			copper: [
				{
					mine: 'South Huel Inventa',
					year: '1872',
					ore: 2654,
					copper: { tons: 219, cwts: 3, qrs: 2, lbs: 27 },
					pounds: 17428
				}
			]
		};
		const store = returnZones(ledger, mineZones(cornish));
		expect(store.areas).toHaveLength(1);
		expect(store.areas![0]).toMatchObject({ name: 'South Huel Inventa', kind: 'mine returns' });
		expect(store.areas![0].claims).toEqual({
			'1872.copper ore': '2,654 tons',
			'1872.copper': '219 tons 3 cwts 2 qrs 27 lbs',
			'1872.pounds': '17,428'
		});
	});

	it('gives boreholes as things standing alone, by name, with their depth and year', () => {
		const store = boreholeRecords({
			source: 'British Geological Survey, Single Onshore Borehole Index',
			licence: 'Invented',
			retrieved: '2026-11-07',
			boreholes: [
				{
					ref: 'NY00SW1',
					name: 'INVENTED MOOR NO 1',
					depth: 117.35,
					year: '1956',
					at: [54.7, -2.2]
				},
				{ ref: 'NY00SW2', at: [54.7, -2.21] }
			],
			rocks: []
		});
		expect(store.records).toEqual([
			{
				id: 'NY00SW1',
				at: [54.7, -2.2],
				claims: { name: 'INVENTED MOOR NO 1', kind: 'borehole', depth: '117.35', year: '1956' }
			}
		]);
	});

	it('lays the rocks beneath as zones, bedrock apart from what lies over it, holes kept', () => {
		const outer = ring(54.7, -2.2, 0.01);
		const hole = ring(54.7, -2.2, 0.001);
		const store = rockZones({
			source: 'British Geological Survey, BGS Geology 625k',
			licence: 'Invented',
			retrieved: '2026-11-07',
			boreholes: [],
			rocks: [
				{
					layer: 'bedrock',
					name: 'INVENTED GROUP',
					rock: 'LIMESTONE',
					age: 'ASBIAN',
					parts: [[outer, hole]]
				},
				{ layer: 'superficial', name: 'INVENTED TILL', rock: 'DIAMICTON', parts: [[outer]] }
			]
		});
		expect(store.areas).toEqual([
			{
				id: 'rock-0',
				name: 'INVENTED GROUP',
				kind: 'bedrock',
				rings: [outer],
				holes: [hole],
				claims: { rock: 'LIMESTONE', age: 'ASBIAN' }
			},
			{
				id: 'rock-1',
				name: 'INVENTED TILL',
				kind: 'superficial deposits',
				rings: [outer],
				holes: [],
				claims: { rock: 'DIAMICTON' }
			}
		]);
	});
});
