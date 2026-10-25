import { describe, expect, it } from 'vitest';
import { heavensFacts } from './heavens';

describe('heavensFacts', () => {
	const facts = heavensFacts(new Date('2026-06-21T12:00:00Z'), {
		latitude: 51.38,
		longitude: -0.07
	});

	it('gives the sun and moon now, as calculated, with provenance', () => {
		const keys = facts.map((f) => f.claim.key).sort();
		expect(keys).toEqual([
			'moon:altitude',
			'moon:azimuth',
			'moon:phase',
			'sun:altitude',
			'sun:azimuth'
		]);
		for (const f of facts) {
			expect(f.subject).toBe('sky/now');
			expect(f.source).toMatch(/calculated/i);
			expect(f.observed).toBe('2026-06-21T12:00:00.000Z');
		}
	});

	it('gives nothing without a place', () => {
		expect(heavensFacts(new Date(), undefined)).toEqual([]);
	});
});
