import { describe, expect, it } from 'vitest';
import { lightingNow } from './lighting';

describe('lightingNow: the map says a street is lit; the sun says whether it is dark', () => {
	it('ties the lit street to the hour, never claiming the lamps are seen', () => {
		expect(lightingNow('yes', undefined, 30)).toBe('Lit at night, though it is day now.');
		expect(lightingNow('yes', undefined, -3)).toBe('Lit at night, and night is coming on.');
		expect(lightingNow('yes', undefined, -20)).toBe('Lit, and it is dark now.');
	});

	it('says an unlit street is unlit, and darker for it after dusk', () => {
		expect(lightingNow('no', undefined, 30)).toBe('Unlit.');
		expect(lightingNow('no', undefined, -3)).toBe('Unlit, and the light is going.');
		expect(lightingNow('no', undefined, -20)).toBe('Unlit, and it is dark now.');
	});

	it('keeps the pavement with it', () => {
		expect(lightingNow('yes', 'pavement on both sides', -20)).toBe(
			'Lit, and it is dark now, with pavement on both sides.'
		);
	});
});
