import { describe, expect, it } from 'vitest';
import type { Fact } from '../facts';
import { disruptionLines } from './disruptions';

// Invented disruptions on invented roads.
const fact = (subject: string, key: string, value: string): Fact => ({
	id: `${subject}:${key}`,
	subject,
	claim: { key, value },
	source: 'TfL',
	observed: '2026-10-30',
	reach: 0,
	geometry: []
});
const disruption = (id: string, metres: number, comments: string, end = '2026-11-03T18:00:00Z') => [
	fact(`tfl/${id}`, 'comments', comments),
	fact(`tfl/${id}`, 'end', end),
	fact(`tfl/${id}`, 'metres', String(metres))
];

describe('disruptionLines', () => {
	it('tells the nearest two as hearsay, the words as found, with the day they end', () => {
		const lines = disruptionLines([
			...disruption('a', 150, '[A999] Invented Road - Lane closed. '),
			...disruption('b', 20, 'Invented Lane - Road closed.'),
			...disruption('c', 90, 'Inventa Way - Temporary lights.')
		]);
		expect(lines).toEqual([
			'They say of the road here: “Invented Lane - Road closed.”, until 3 November.',
			'And: “Inventa Way - Temporary lights.”, until 3 November.'
		]);
		expect(lines.join(' ')).not.toContain('TfL');
	});

	it('says nothing with nothing near', () => {
		expect(disruptionLines([])).toEqual([]);
	});
});
