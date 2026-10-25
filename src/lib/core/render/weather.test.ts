import { describe, expect, it } from 'vitest';
import { currentWeatherFacts } from '../adapters/weather';
import { weatherNow } from './weather';

describe('weatherNow', () => {
	it('says today’s sky and temperature', () => {
		const now = currentWeatherFacts({
			current: { time: '2026-10-25T16:45', weather_code: 61, temperature_2m: 11.4 }
		});
		expect(weatherNow(now)).toBe('Today: light rain, 11 °C.');
	});

	it('says nothing without word of today', () => {
		expect(weatherNow([])).toBeUndefined();
	});
});
