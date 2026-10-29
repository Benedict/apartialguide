import { describe, expect, it } from 'vitest';
import { geographRecords } from './geograph';

const box = '-0.09,51.37,-0.06,51.39';
const photo = (o: Record<string, unknown>) => ({
	id: 1,
	title: 'Long Street, looking east',
	lat: 51.38,
	long: -0.07,
	taken: '2009-05-02',
	...o
});

describe('geographRecords (photographs and their titles)', () => {
	it('keeps the latest photograph in each patch, its title as found and when taken', () => {
		expect(
			geographRecords(
				{
					items: [
						photo({ id: 1, taken: '2005-01-01', title: 'Older' }),
						photo({ id: 2 }),
						photo({ id: 3, lat: 52 }),
						photo({ id: 4, title: '' })
					]
				},
				box
			)
		).toEqual([
			{
				id: '2',
				at: [51.38, -0.07],
				observed: '2009-05-02',
				claims: { name: 'Long Street, looking east', kind: 'photograph', taken: '2009-05' }
			}
		]);
	});
});
