import { describe, expect, it } from 'vitest';
import { hygieneRecords } from './hygiene';

const box = '-0.09,51.37,-0.06,51.39';

describe('hygieneRecords', () => {
	it('takes each establishment in the box: linked by its FHRS id, placed, dated by its rating', () => {
		const records = hygieneRecords(
			{
				establishments: [
					{
						FHRSID: 111,
						BusinessName: 'Invented Kebab',
						BusinessType: 'Takeaway/sandwich shop',
						RatingValue: '5',
						RatingDate: '2024-03-01T00:00:00',
						geocode: { longitude: '-0.07', latitude: '51.38' }
					}
				]
			},
			box
		);
		expect(records).toEqual([
			{
				id: '111',
				link: { key: 'fhrs:id', value: '111' },
				at: [51.38, -0.07],
				observed: '2024-03-01',
				claims: {
					name: 'Invented Kebab',
					kind: 'Takeaway/sandwich shop',
					rating: '5',
					date: '2024-03-01'
				}
			}
		]);
	});

	it('reads the date the inspectors put where they have none, 1 January 1901, as no date', () => {
		const [record] = hygieneRecords(
			{
				establishments: [
					{
						FHRSID: 222,
						BusinessName: 'Invented Care Home',
						RatingValue: 'AwaitingInspection',
						RatingDate: '1901-01-01T00:00:00',
						geocode: { longitude: '-0.07', latitude: '51.38' }
					}
				]
			},
			box
		);
		expect(record.observed).toBeUndefined();
		expect(record.claims.date).toBeUndefined();
		expect(record.claims.rating).toBe('AwaitingInspection');
	});

	it('leaves out what lies outside the box, and keeps an unrated or unplaced one as found', () => {
		const records = hygieneRecords(
			{
				establishments: [
					{
						FHRSID: 1,
						BusinessName: 'Far',
						RatingValue: '4',
						geocode: { longitude: '-0.2', latitude: '51.5' }
					},
					{
						FHRSID: 2,
						BusinessName: 'Unplaced',
						RatingValue: 'AwaitingInspection',
						RatingDate: null,
						geocode: {}
					}
				]
			},
			box
		);
		expect(records).toEqual([
			{
				id: '2',
				link: { key: 'fhrs:id', value: '2' },
				claims: { name: 'Unplaced', rating: 'AwaitingInspection' }
			}
		]);
	});
});
