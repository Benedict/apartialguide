import { describe, expect, it } from 'vitest';
import { currentAirFacts } from './air';
import { airNow } from '../render/air';

describe('currentAirFacts (Open-Meteo air quality)', () => {
	it('reads the European air quality index now, observed when it was measured', () => {
		const facts = currentAirFacts({ current: { time: '2026-10-29T09:00', european_aqi: 32 } });
		expect(facts).toEqual([
			expect.objectContaining({
				subject: 'air/now',
				claim: { key: 'air:index', value: '32' },
				observed: '2026-10-29T09:00'
			})
		]);
	});

	it('is nothing without an answer', () => {
		expect(currentAirFacts({})).toEqual([]);
		expect(currentAirFacts({ current: { time: 't', european_aqi: null } })).toEqual([]);
	});
});

describe('airNow', () => {
	const said = (n: number) => airNow(currentAirFacts({ current: { time: 't', european_aqi: n } }));

	it('says the air in the index’s own bands, with its number', () => {
		expect(said(12)).toBe('The air: good, 12 on the European index.');
		expect(said(32)).toBe('The air: fair, 32 on the European index.');
		expect(said(55)).toBe('The air: moderate, 55 on the European index.');
		expect(said(70)).toBe('The air: poor, 70 on the European index.');
		expect(said(90)).toBe('The air: very poor, 90 on the European index.');
		expect(said(130)).toBe('The air: extremely poor, 130 on the European index.');
	});

	it('says nothing without word of it', () => {
		expect(airNow([])).toBeUndefined();
	});
});
