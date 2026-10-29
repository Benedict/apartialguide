import { describe, expect, it } from 'vitest';
import { aside, hearsay, HEARSAY } from './hearsay';

describe('hearsay', () => {
	it('gives what another keeps as something said, never as another account', () => {
		const said = hearsay('you have left Inventa West');
		expect(said).toMatch(HEARSAY);
		expect(said).toMatch(/ you have left Inventa West\.$/);
		expect(said).not.toMatch(/account/i);
	});

	it('says the same thing the same way every time, and different things differently', () => {
		const clauses = [
			'you are in Inventa West, a ward',
			'it was rated D',
			'the map runs into 9 wards'
		];
		expect(clauses.map(hearsay)).toEqual(clauses.map(hearsay));
		const leads = new Set(
			Array.from({ length: 40 }, (_, i) => hearsay(`clause ${i}`).split(' ').slice(0, 2).join(' '))
		);
		expect(leads.size).toBeGreaterThan(2);
	});

	it('sets it aside within a sentence, as said', () => {
		expect(aside('“Invented Chapel”')).toMatch(/^(they say|it is said|someone wrote down)$/);
		expect(aside('“Invented Chapel”')).toBe(aside('“Invented Chapel”'));
	});
});
