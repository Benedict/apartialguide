import { describe, expect, it } from 'vitest';
import { hearsay, HEARSAY, keptAside, keptHearsay } from './hearsay';

describe('hearsay', () => {
	it('says what lies beyond the map one way, as said, never as another account', () => {
		const said = hearsay('beyond what the map shows, “Invented Way”, a road');
		expect(said).toMatch(HEARSAY);
		expect(said).toBe('They say beyond what the map shows, “Invented Way”, a road.');
		expect(said).not.toMatch(/account/i);
	});
});

describe('the prompt’s old hearsay', () => {
	it('keeps the leads and asides it always had, word for word, so stored prose keeps its keys', () => {
		expect(keptHearsay('you have left Inventa West')).toMatch(
			/^(They say|It is said that|Someone wrote down that|Word is) you have left Inventa West\.$/
		);
		expect(keptHearsay('you have left Inventa West')).toBe(
			keptHearsay('you have left Inventa West')
		);
		expect(keptAside('“Invented Chapel”')).toMatch(/^(they say|it is said|someone wrote down)$/);
	});
});
