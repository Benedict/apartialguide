import { describe, expect, it } from 'vitest';
import { ROMAN_SOURCES } from './sources';

describe('the Roman walk’s sources', () => {
	const named = (name: string) => ROMAN_SOURCES.find((s) => s.name === name);
	it('credits Digital Britannia, and the projects its settlements and the Wall came from', () => {
		expect(named('Digital Britannia')?.terms).toContain('© Mike Haken 2026, CC BY-NC 4.0');
		expect(named('Digital Britannia')?.terms).toContain('Rural Settlement of Roman Britain');
		const wall = named('WallCAP')!;
		expect(wall.terms).toContain('CC BY 4.0');
		expect(wall.terms).toContain('Kathryn Murphy');
		expect(wall.terms).toContain('Nicky Garland');
		expect(wall.href).toBe('https://doi.org/10.5284/1100071');
	});
	it('keeps the sources that work anywhere, and none that know only London', () => {
		const names = ROMAN_SOURCES.map((s) => s.name);
		expect(names).toContain('Open-Meteo');
		expect(names).not.toContain('OpenStreetMap');
		expect(names).not.toContain('Transport for London');
	});
});
