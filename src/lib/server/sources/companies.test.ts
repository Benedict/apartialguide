import { describe, expect, it } from 'vitest';
import { companyRecords } from './companies';

const row = (o: Record<string, string>) => ({
	CompanyName: 'INVENTED LTD',
	CompanyNumber: '00000001',
	'RegAddress.AddressLine1': '9 LONG STREET',
	'RegAddress.AddressLine2': '',
	'RegAddress.PostCode': 'CR0 9ZZ',
	CompanyStatus: 'Active',
	IncorporationDate: '02/05/2019',
	...o
});

describe('companyRecords (Companies House basic company data)', () => {
	it('gathers the companies registered at each address in the given postcodes, names as found', () => {
		const records = companyRecords(
			[
				row({}),
				row({ CompanyName: 'OLDER LTD', CompanyNumber: '2', IncorporationDate: '09/01/2004' }),
				row({
					CompanyName: 'FLAT LTD',
					CompanyNumber: '3',
					'RegAddress.AddressLine1': 'FLAT 2',
					'RegAddress.AddressLine2': '11 Long Street'
				}),
				row({ CompanyName: 'ELSEWHERE LTD', 'RegAddress.PostCode': 'EC1 1AA' })
			],
			new Set(['CR0 9ZZ'])
		);
		expect(records).toEqual([
			{
				id: '9|LONG STREET',
				address: { number: '9', street: 'LONG STREET' },
				claims: { count: '2', names: 'OLDER LTD|INVENTED LTD', since: '2004-01-09' }
			},
			{
				id: '11|Long Street',
				address: { number: '11', street: 'Long Street' },
				claims: { count: '1', names: 'FLAT LTD', since: '2019-05-02' }
			}
		]);
	});
});
