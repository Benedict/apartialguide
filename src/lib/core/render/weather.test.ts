import { describe, expect, it } from 'vitest';
import { WeatherAdapter } from '../adapters/weather';
import { weatherThatDay } from './weather';

const facts = new WeatherAdapter({
	source: 'Open-Meteo',
	latitude: 51.38,
	longitude: -0.07,
	days: [
		{ date: '2017-01-01', code: 3, temperatureMin: 2, temperatureMax: 5 },
		{ date: '2018-10-04', code: 61, temperatureMin: 9.4, temperatureMax: 13.6 },
		{ date: '2019-02-01', code: 73, temperatureMin: -1.2, temperatureMax: -1.2 },
		{ date: '2020-01-01', code: 42 }
	]
}).facts();

describe('weatherThatDay', () => {
	it('says the sky and the temperatures, rounded', () => {
		expect(weatherThatDay(facts, '2017-01-01')).toBe('Overcast that day, 2 to 5 °C.');
		expect(weatherThatDay(facts, '2018-10-04')).toBe('Light rain that day, 9 to 14 °C.');
	});

	it('gives one temperature when the day held at one', () => {
		expect(weatherThatDay(facts, '2019-02-01')).toBe('Snow that day, -1 °C.');
	});

	it('says nothing of a day it has no record of, or a code it cannot read', () => {
		expect(weatherThatDay(facts, '2021-01-01')).toBeUndefined();
		expect(weatherThatDay(facts, '2020-01-01')).toBeUndefined();
	});
});
