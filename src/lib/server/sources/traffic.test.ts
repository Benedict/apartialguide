import { describe, expect, it } from 'vitest';
import { trafficRecords } from './traffic';

// Invented count points: no real road.
const row = (over: Record<string, string>) => ({
	count_point_id: '1',
	year: '2025',
	road_name: 'A999',
	road_type: 'Major',
	latitude: '51.38',
	longitude: '-0.08',
	estimation_method: 'Counted',
	all_motor_vehicles: '34231',
	pedal_cycles: '194',
	...over
});

describe('trafficRecords', () => {
	it('keeps each count point’s latest year in the box, on the road it names or the road it lies on', () => {
		const records = trafficRecords(
			[
				row({ year: '2019', all_motor_vehicles: '30000' }),
				row({}),
				row({ count_point_id: '2', road_name: 'U', road_type: 'Minor', pedal_cycles: '' }),
				row({ count_point_id: '3', latitude: '52.5' })
			],
			'-0.1,51.3,0,51.4'
		);
		expect(records).toEqual([
			{
				id: '1',
				at: [51.38, -0.08],
				observed: '2025-12-31',
				near: { key: 'ref', value: 'A999', within: 40 },
				claims: { year: '2025', vehicles: '34231', cycles: '194', method: 'Counted' }
			},
			{
				id: '2',
				at: [51.38, -0.08],
				observed: '2025-12-31',
				near: { key: 'highway', value: expect.arrayContaining(['residential']), within: 25 },
				claims: { year: '2025', vehicles: '34231', method: 'Counted' }
			}
		]);
	});
});
