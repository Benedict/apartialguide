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

describe('planningRecords and people', () => {
	const hit = (source: Record<string, unknown>) => ({
		hits: {
			hits: [
				{
					_id: 'x',
					_source: {
						lpa_app_no: '24/9',
						site_number: '12',
						street_name: 'Example Road',
						decision_date: '2024-05-01',
						centroid: { lat: 51.38, lon: -0.07 },
						...source
					}
				}
			]
		}
	});

	it('keeps only the reference, address, description, decision and dates: never an applicant or agent', () => {
		const [record] = planningRecords(
			hit({
				description: 'Rear extension',
				applicant_name: 'Mr J Smith',
				agent_name: 'Invented Agents',
				applicant_address: '12 Example Road'
			}),
			box
		);
		expect(Object.keys(record.claims).sort()).toEqual(['application', 'date']);
		expect(JSON.stringify(record)).not.toMatch(/Smith|Invented Agents/);
	});

	it('takes a name out of the description, and logs that it did, never the name itself', () => {
		const logged: string[] = [];
		const [record] = planningRecords(
			hit({ description: 'Rear extension for Mrs A Jones' }),
			box,
			(line) => logged.push(line)
		);
		expect(record.claims.application).toBe('Rear extension');
		expect(logged).toHaveLength(1);
		expect(logged[0]).toContain('24/9');
		expect(logged[0]).not.toContain('Jones');
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
	const binding = (paon: string, amount: string, date: string, street = 'LONG STREET') => ({
		paon: { value: paon },
		street: { value: street },
		amount: { value: amount },
		date: { value: date }
	});
	const sales = (...bindings: ReturnType<typeof binding>[]) => ({ results: { bindings } });

	it('keeps no sale at an address: only each street’s middle 80% of sales, as a range since a year', () => {
		const records = priceRecords(
			sales(
				binding('2', '401000', '2020-02-01'),
				binding('4', '430000', '2021-05-01'),
				binding('6', '482500', '2022-07-01'),
				binding('8', '511000', '2023-01-01'),
				binding('10', '538000', '2024-03-01'),
				binding('12', '250000', '2011-03-01')
			),
			'2026-10-25'
		);
		expect(records).toEqual([
			{
				id: 'LONG STREET',
				street: 'LONG STREET',
				observed: '2024-03-01',
				// The 10th and 90th percentiles, 412,600 and 527,200, each to the nearest £25,000.
				claims: { since: '2020', sales: '5', low: '425000', high: '525000' }
			}
		]);
		expect(JSON.stringify(records)).not.toMatch(/482500|"address"|"number"/);
	});

	it('rounds each end of the range to the nearest £25,000, never down to nothing', () => {
		const range = (amount: string) =>
			priceRecords(
				sales(...[1, 2, 3, 4, 5].map((i) => binding(String(i), amount, '2023-01-01'))),
				'2026-10-25'
			)[0].claims;
		expect(range('412499')).toMatchObject({ low: '400000', high: '400000' });
		expect(range('412500')).toMatchObject({ low: '425000', high: '425000' });
		expect(range('5000')).toMatchObject({ low: '25000', high: '25000' });
	});

	it('leaves a block sold whole, or a garage, out of the range, as neither end is one sale', () => {
		const amounts = [
			'8000',
			'400000',
			'410000',
			'420000',
			'430000',
			'440000',
			'450000',
			'460000',
			'470000',
			'39000000'
		];
		const [street] = priceRecords(
			sales(...amounts.map((a, i) => binding(String(i), a, '2023-01-01'))),
			'2026-10-25'
		);
		expect(street.claims).toMatchObject({ low: '400000', high: '475000' });
	});

	it('says nothing of a street with fewer than five sales in the period', () => {
		expect(
			priceRecords(
				sales(
					binding('1', '300000', '2021-01-01', 'QUIET CLOSE'),
					binding('3', '310000', '2022-01-01', 'QUIET CLOSE'),
					binding('5', '320000', '2023-01-01', 'QUIET CLOSE'),
					binding('7', '330000', '2019-12-31', 'QUIET CLOSE')
				),
				'2026-10-25'
			)
		).toEqual([]);
	});

	it('counts the period from six years before the records were taken', () => {
		const [street] = priceRecords(
			sales(
				...['2021-01-01', '2021-06-01', '2022-01-01', '2023-01-01', '2024-01-01'].map((d, i) =>
					binding(String(i), '400000', d)
				)
			),
			'2027-03-01'
		);
		expect(street.claims.since).toBe('2021');
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
