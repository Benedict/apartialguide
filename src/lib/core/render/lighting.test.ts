import { describe, expect, it } from 'vitest';
import { lightingNow } from './lighting';

describe('lightingNow: lamps along a lit street, by the hour', () => {
	it('puts lamps along a lit street, out by day, coming on at dusk, lighting the way at night', () => {
		expect(lightingNow('yes', undefined, 30, 0)).toBe(
			'There are street lamps along here, unlit by day.'
		);
		expect(lightingNow('yes', undefined, -3, 0)).toBe('The street lamps are coming on.');
		expect(lightingNow('yes', undefined, -20, 0)).toBe('Street lamps light the way.');
	});

	it('turns between two ways of saying each, by the stop', () => {
		expect(lightingNow('yes', undefined, 30, 1)).toBe(
			'Street lamps line the way; it is day, and they are out.'
		);
		expect(lightingNow('yes', undefined, -20, 1)).toBe(
			'The street lamps are lit, and the dark sits between them.'
		);
	});

	it('says an unlit street has no lamps, and is dark at night', () => {
		expect(lightingNow('no', undefined, 30, 0)).toBe('There are no street lamps here.');
		expect(lightingNow('no', undefined, -3, 0)).toBe('No street lamps, and the light is going.');
		expect(lightingNow('no', undefined, -20, 0)).toBe('No street lamps; it is dark.');
	});

	it('keeps the pavement, in a sentence of its own', () => {
		expect(lightingNow('yes', 'pavement on both sides', -20, 0)).toBe(
			'Street lamps light the way. There is pavement on both sides.'
		);
	});
});
