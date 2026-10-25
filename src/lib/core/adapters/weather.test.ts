import { describe, expect, it } from 'vitest';
import { currentWeatherFacts, WeatherAdapter, type WeatherStore } from './weather';

const store: WeatherStore = {
	source: 'Open-Meteo',
	latitude: 51.38,
	longitude: -0.07,
	days: [
		{ date: '2017-01-01', code: 3, temperatureMin: 2, temperatureMax: 5, precipitation: 0 },
		{ date: '2026-10-24', code: 61, temperatureMin: 9.4, temperatureMax: 13.1 }
	]
};

describe('WeatherAdapter', () => {
	it('makes each recorded day a fact, dated that day', () => {
		const facts = new WeatherAdapter(store)
			.facts()
			.filter((f) => f.subject === 'weather/2017-01-01');
		expect(facts.map((f) => f.claim)).toEqual([
			{ key: 'weather:code', value: '3' },
			{ key: 'weather:temperature_min', value: '2' },
			{ key: 'weather:temperature_max', value: '5' },
			{ key: 'weather:precipitation', value: '0' }
		]);
		expect(facts[0]).toMatchObject({ source: 'Open-Meteo', observed: '2017-01-01' });
	});

	it('leaves out what was not recorded', () => {
		const facts = new WeatherAdapter(store)
			.facts()
			.filter((f) => f.subject === 'weather/2026-10-24');
		expect(facts.map((f) => f.claim.key)).not.toContain('weather:precipitation');
	});
});

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
