import { describe, expect, it } from 'vitest';
import { currentWeatherFacts } from './weather';

describe('currentWeatherFacts', () => {
	it('makes Open-Meteo’s weather now into facts about now, observed when it was measured', () => {
		const facts = currentWeatherFacts({
			current: { time: '2026-10-25T16:45', weather_code: 61, temperature_2m: 11.4 }
		});
		expect(facts.map((f) => f.claim)).toEqual([
			{ key: 'weather:code', value: '61' },
			{ key: 'weather:temperature', value: '11.4' }
		]);
		expect(facts[0]).toMatchObject({
			subject: 'weather/now',
			source: 'Open-Meteo.com',
			observed: '2026-10-25T16:45'
		});
	});

	it('is nothing when the answer has no weather in it', () => {
		expect(currentWeatherFacts({})).toEqual([]);
		expect(currentWeatherFacts({ current: { time: '2026-10-25T16:45' } })).toEqual([]);
	});
});
