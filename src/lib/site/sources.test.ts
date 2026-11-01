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

	it('credits Digital Britannia as its licence asks, with the project its settlements came from', () => {
		const roman = SOURCES.find((s) => s.name === 'Digital Britannia');
		expect(roman?.terms).toContain('© Mike Haken 2026');
		expect(roman?.terms).toContain('CC BY-NC 4.0');
		expect(roman?.terms).toContain('Rural Settlement of Roman Britain');
		expect(roman?.terms).toContain('Archaeology Data Service');
	});
});
