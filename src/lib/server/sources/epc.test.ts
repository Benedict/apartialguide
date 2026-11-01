import { describe, expect, it } from 'vitest';
import { epcFromSearch, epcRecords } from './epc';

const cert = (o: Record<string, string>) => ({
	address1: '9 Long Street',
	address2: '',
	postcode: 'CR0 9ZZ',
	'construction-age-band': 'England and Wales: 1900-1929',
	'current-energy-rating': 'D',
	'lodgement-date': '2019-03-14',
	...o
});

describe('epcRecords (energy performance certificates)', () => {
	it('keeps the latest certificate for each address: when it was built, its rating, when lodged', () => {
		expect(
			epcRecords([
				cert({ 'lodgement-date': '2012-01-01', 'current-energy-rating': 'E' }),
				cert({}),
				cert({
					address1: 'Flat 2',
					address2: '11 Long Street',
					'construction-age-band': 'before 1900'
				})
			])
		).toEqual([
			{
				id: '9|Long Street',
				address: { number: '9', street: 'Long Street' },
				observed: '2019-03-14',
				claims: { built: '1900-1929', rating: 'D', lodged: '2019-03-14' }
			},
			{
				id: '11|Long Street',
				address: { number: '11', street: 'Long Street' },
				observed: '2019-03-14',
				claims: { built: 'before 1900', rating: 'D', lodged: '2019-03-14' }
			}
		]);
	});

	it('leaves out an age band the certificate does not give', () => {
		const [r] = epcRecords([cert({ 'construction-age-band': 'NO DATA!' })]);
		expect(r.claims.built).toBeUndefined();
		expect(r.claims.rating).toBe('D');
	});

	it('reads the new register’s search, which gives the rating and when lodged, but not when built', () => {
		const rows = epcFromSearch({
			data: [
				{
					certificateNumber: '1111-2222-3333-4444-5555',
					addressLine1: '9 Long Street',
					addressLine2: null,
					postcode: 'CR0 9ZZ',
					currentEnergyEfficiencyBand: 'C',
					registrationDate: '2021-08-11'
				}
			],
			pagination: { totalRecords: 1, currentPage: 1, totalPages: 1, nextPage: null }
		});
		expect(epcRecords(rows)).toEqual([
			{
				id: '9|Long Street',
				address: { number: '9', street: 'Long Street' },
				observed: '2021-08-11',
				claims: { rating: 'C', lodged: '2021-08-11' }
			}
		]);
	});

	it('reads nothing from an answer with no certificates', () => {
		expect(epcFromSearch({})).toEqual([]);
		expect(epcFromSearch({ data: [] })).toEqual([]);
	});
});
