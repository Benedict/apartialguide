import { describe, expect, it } from 'vitest';
import {
	crimeRecords,
	planningRecords,
	plaqueRecords,
	priceRecords,
	protectedRecords
} from './more';

const box = '-0.09,51.37,-0.06,51.39';

describe('protectedRecords (planning.data.gov.uk)', () => {
	it('takes listed buildings with their grade and listing date, placed by their point', () => {
		const records = protectedRecords(
			{
				entities: [
					{
						entity: 42,
						name: 'Invented Chapel',
						dataset: 'listed-building',
						'listed-building-grade': 'II',
						'start-date': '1973-03-01',
						point: 'POINT (-0.07 51.38)'
					}
				]
			},
			box
		);
		expect(records).toEqual([
			{
				id: '42',
				at: [51.38, -0.07],
				observed: '1973-03-01',
				claims: {
					name: 'Invented Chapel',
					description: 'listed building',
					grade: 'II',
					listed: '1973-03-01'
				}
			}
		]);
	});

	it('takes protected trees by their species', () => {
		const [tree] = protectedRecords(
			{
				entities: [
					{
						entity: 7,
						dataset: 'tree',
						'tree-species': 'Invented Oak',
						point: 'POINT (-0.071 51.381)'
					}
				]
			},
			box
		);
		expect(tree.claims).toEqual({
			name: 'Invented Oak',
			description: 'protected tree',
			species: 'Invented Oak'
		});
	});
});

describe('planningRecords (London Planning Datahub)', () => {
	it('keeps the latest application at each address, dated whichever way the date is written', () => {
		const records = planningRecords(
			{
				hits: {
					hits: [
						{
							_id: 'a',
							_source: {
								lpa_app_no: '19/1',
								description: 'Older plan',
								decision_date: '01/05/2019',
								site_number: '9',
								street_name: 'Long Street',
								centroid: { lat: 51.38, lon: -0.07 }
							}
						},
						{
							_id: 'b',
							_source: {
								lpa_app_no: '23/2',
								description: 'Change of use to invented flats',
								decision: 'Approved',
								decision_date: '2023-03-14',
								site_number: '9',
								street_name: 'Long Street',
								centroid: { lat: 51.38, lon: -0.07 }
							}
						}
					]
				}
			},
			box
		);
		expect(records).toEqual([
			{
				id: '23/2',
				address: { number: '9', street: 'Long Street' },
				at: [51.38, -0.07],
				observed: '2023-03-14',
				claims: {
					application: 'Change of use to invented flats',
					decision: 'Approved',
					date: '2023-03-14'
				}
			}
		]);
	});
});

describe('plaqueRecords (Open Plaques)', () => {
	it('takes each plaque in the box by its inscription', () => {
		expect(
			plaqueRecords(
				[
					{
						id: 5,
						inscription: 'Ada Inventa lived here',
						latitude: 51.38,
						longitude: -0.07,
						erected_at: '1999-06-01'
					}
				],
				box
			)
		).toEqual([
			{
				id: '5',
				at: [51.38, -0.07],
				observed: '1999-06-01',
				claims: {
					name: 'Ada Inventa lived here',
					description: 'plaque',
					inscription: 'Ada Inventa lived here',
					erected: '1999-06-01'
				}
			}
		]);
	});
});

describe('priceRecords (Land Registry)', () => {
	it('keeps the latest sale at each address', () => {
		const binding = (paon: string, amount: string, date: string) => ({
			paon: { value: paon },
			street: { value: 'LONG STREET' },
			amount: { value: amount },
			date: { value: date }
		});
		expect(
			priceRecords({
				results: {
					bindings: [binding('9', '250000', '2011-02-01'), binding('9', '412000', '2019-03-08')]
				}
			})
		).toEqual([
			{
				id: '9|LONG STREET',
				address: { number: '9', street: 'LONG STREET' },
				observed: '2019-03-08',
				claims: { sold: '412000', date: '2019-03-08' }
			}
		]);
	});
});

describe('crimeRecords (police.uk)', () => {
	it('counts each month’s reports by street and kind, most first', () => {
		const crime = (category: string, street: string) => ({
			category,
			month: '2026-08',
			location: { latitude: '51.38', longitude: '-0.07', street: { name: `On or near ${street}` } }
		});
		expect(
			crimeRecords([
				crime('anti-social-behaviour', 'Long Street'),
				crime('burglary', 'Long Street'),
				crime('anti-social-behaviour', 'Long Street')
			])
		).toEqual([
			{
				id: 'Long Street|2026-08',
				street: 'Long Street',
				observed: '2026-08-01',
				claims: { month: '2026-08', reports: '3', kinds: 'anti-social behaviour (2), burglary (1)' }
			}
		]);
	});
});
