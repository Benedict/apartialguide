import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Scene } from '../core/scene';
import { narrationOnly, narrationWithin } from './only';

// Invented wards and areas: a square ward, not a real boundary.
const dir = mkdtempSync(join(tmpdir(), 'only-'));
const records = join(dir, 'records');
const areasPath = join(dir, 'areas.json');
writeFileSync(
	areasPath,
	JSON.stringify({ areas: [{ name: 'Inventa', wards: ['Inventa North'] }] })
);
mkdirSync(records);
writeFileSync(
	join(records, 'ward-2026-10-25.json'),
	JSON.stringify({
		source: 'Invented',
		prefix: 'ward',
		retrieved: '2026-10-25',
		records: [],
		areas: [
			{
				id: 'W1',
				name: 'Inventa North',
				kind: 'ward',
				rings: [
					[
						[51, 0],
						[51, 1],
						[52, 1],
						[52, 0],
						[51, 0]
					]
				]
			}
		]
	})
);
const at = (position: [number, number]) => ({ position, things: [] }) as unknown as Scene;

describe('which stops a narration run writes', () => {
	it('writes every stop when told nothing', () => {
		expect(narrationOnly({}, records, areasPath)).toBeUndefined();
	});

	it('writes only the stops in the area named, by its wards', () => {
		const only = narrationOnly({ NARRATE_AREA: 'Inventa' }, records, areasPath)!;
		expect(only(at([51.5, 0.5]))).toBe(true);
		expect(only(at([51.5, 1.5]))).toBe(false);
	});

	it('refuses an area it does not know', () => {
		expect(() => narrationOnly({ NARRATE_AREA: 'Nowhere' }, records, areasPath)).toThrow(/Nowhere/);
	});

	it('tells by place alone whether a stop is in the area, before it is visited', () => {
		const within = narrationWithin({ NARRATE_AREA: 'Inventa' }, records, areasPath)!;
		expect(within({ position: [51.5, 0.5] } as never)).toBe(true);
		expect(within({ position: [51.5, 1.5] } as never)).toBe(false);
		expect(narrationWithin({}, records, areasPath)).toBeUndefined();
	});
});
