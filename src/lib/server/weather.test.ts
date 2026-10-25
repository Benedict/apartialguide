import { describe, expect, it } from 'vitest';
import { daysFromOpenMeteo, recordedDates } from './weather';

describe('daysFromOpenMeteo', () => {
	const daily = {
		time: ['2017-01-01', '2017-01-02', '2017-01-03'],
		weather_code: [3, 61, null],
		temperature_2m_min: [2.1, 4, null],
		temperature_2m_max: [5.2, 7, null],
		precipitation_sum: [0, 3.2, null],
		wind_speed_10m_max: [11, 20.5, null]
	};

	it('keeps only the days asked for, with what was measured', () => {
		expect(daysFromOpenMeteo({ daily }, ['2017-01-02'])).toEqual([
			{
				date: '2017-01-02',
				code: 61,
				temperatureMin: 4,
				temperatureMax: 7,
				precipitation: 3.2,
				windMax: 20.5
			}
		]);
	});

	it('leaves out a day with nothing measured yet', () => {
		expect(daysFromOpenMeteo({ daily }, ['2017-01-03'])).toEqual([]);
	});
});

describe('recordedDates', () => {
	it('gathers the days the map records, once each, in order', () => {
		const dates = recordedDates({
			snapshotDate: '2026-10-24',
			historyDates: ['2017-01-01', '2013-01-01'],
			snapshot: {
				elements: [
					{ type: 'node', id: 1, lat: 0, lon: 0, tags: { check_date: '2018-10-04' } },
					{ type: 'node', id: 2, lat: 0, lon: 0, tags: { 'survey:date': '2018-10' } },
					{ type: 'node', id: 3, lat: 0, lon: 0, tags: { survey_date: '2017-01-01' } }
				]
			}
		});
		expect(dates).toEqual(['2013-01-01', '2017-01-01', '2018-10-04', '2026-10-24']);
	});
});
