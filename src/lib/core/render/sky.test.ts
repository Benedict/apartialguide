import { describe, expect, it } from 'vitest';
import { heavensFacts } from '../adapters/heavens';
import { moonPhaseWords, skyLine } from './sky';

const addiscombe = { latitude: 51.38, longitude: -0.07 };
const at = (iso: string) => skyLine(heavensFacts(new Date(iso), addiscombe));

describe('skyLine', () => {
	it('puts a midsummer midday sun high in the south', () => {
		expect(at('2026-06-21T12:00:00Z')).toBe('The sun is high in the south.');
	});

	it('puts a winter afternoon sun low in the south-west', () => {
		expect(at('2026-12-21T15:00:00Z')).toBe('The sun is low in the south-west.');
	});

	it('speaks of a sun just gone down', () => {
		expect(at('2026-12-21T16:15:00Z')).toBe(
			'The sun is just below the horizon, to the south-west.'
		);
	});

	it('speaks of the moon, or its absence, at night', () => {
		expect(at('2026-01-01T00:00:00Z')).toMatch(
			/^(The moon is (low|up|high) in the [a-z-]+, (new|a waxing crescent|at first quarter|waxing gibbous|full|waning gibbous|at last quarter|a waning crescent)\.|No moon\.)$/
		);
	});

	it('says nothing without the facts', () => {
		expect(skyLine([])).toBeUndefined();
	});
});

describe('moonPhaseWords', () => {
	it.each([
		[0.01, 'new'],
		[0.12, 'a waxing crescent'],
		[0.25, 'at first quarter'],
		[0.37, 'waxing gibbous'],
		[0.5, 'full'],
		[0.62, 'waning gibbous'],
		[0.75, 'at last quarter'],
		[0.9, 'a waning crescent'],
		[0.99, 'new']
	])('names phase %d as %s', (phase, words) => {
		expect(moonPhaseWords(phase)).toBe(words);
	});
});
