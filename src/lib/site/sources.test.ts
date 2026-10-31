import { describe, expect, it } from 'vitest';
import { LIVE, SOURCES } from './sources';

describe('SOURCES', () => {
	it('names, links, and says what each source gives and on what terms', () => {
		for (const s of SOURCES) {
			expect(s.name).toBeTruthy();
			expect(s.href).toMatch(/^https:\/\//);
			expect(s.gives).toBeTruthy();
			expect(s.terms).toBeTruthy();
		}
	});

	it('marks the sources asked from the reader’s browser, each with a setting', () => {
		const live = [
			'weather',
			'departures',
			'roads',
			'maps',
			'cameras',
			'satellites',
			'flights',
			'news',
			'air'
		];
		expect(SOURCES.filter((s) => s.live).map((s) => s.live)).toEqual(live);
		expect(LIVE.map((l) => l.key)).toEqual(live);
	});

	it('gives the attribution the Open Government Licence and TfL ask for', () => {
		const terms = SOURCES.map((s) => s.terms).join(' ');
		expect(terms).toContain('Contains HM Land Registry data © Crown copyright and database right');
		expect(terms).toContain('Contains OS data © Crown copyright and database right');
		expect(terms).toContain('Powered by TfL Open Data');
		expect(terms).toContain('Open Government Licence v3.0');
	});
});
