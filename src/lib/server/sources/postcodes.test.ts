import { describe, expect, it } from 'vitest';
import { postcodeRecords } from './postcodes';

const box = '-0.09,51.37,-0.06,51.39';
const pc = (props: Record<string, unknown>, lon = -0.07, lat = 51.38) => ({
	properties: props,
	geometry: { type: 'Point', coordinates: [lon, lat] }
});

describe('postcodeRecords (ONS Postcode Directory)', () => {
	it('keeps the postcodes that have ended, with when they began and ended, as found', () => {
		const records = postcodeRecords(
			{
				features: [
					pc({ PCDS: 'CR0 9ZZ', DOINTR: '198001', DOTERM: '199806' }),
					pc({ PCDS: 'CR0 9ZY', DOINTR: '198001', DOTERM: null }),
					pc({ pcds: 'CR0 9ZX', dointr: 199001, doterm: 200102 })
				]
			},
			box
		);
		expect(records).toEqual([
			{
				id: 'CR0 9ZZ',
				at: [51.38, -0.07],
				observed: '1998-06-01',
				claims: { name: 'CR0 9ZZ', kind: 'postcode', began: '1980-01', ended: '1998-06' }
			},
			{
				id: 'CR0 9ZX',
				at: [51.38, -0.07],
				observed: '2001-02-01',
				claims: { name: 'CR0 9ZX', kind: 'postcode', began: '1990-01', ended: '2001-02' }
			}
		]);
	});

	it('leaves out what lies outside the box', () => {
		expect(
			postcodeRecords({ features: [pc({ PCDS: 'X1 1XX', DOTERM: '199806' }, 1, 52)] }, box)
		).toEqual([]);
	});
});
