import { describe, expect, it } from 'vitest';
import { arrivalFacts, disruptionFacts } from './tfl';

describe('disruptionFacts', () => {
	// Invented roads around an invented point: not real disruptions.
	const at: [number, number] = [51.38, -0.07];
	const disruption = (id: string, lat: number, lon: number, end: string, more = {}) => ({
		id,
		category: 'Works',
		subCategory: 'Utility works',
		comments: '[A999] Invented Road (Both directions) - Temporary lights in operation. ',
		endDateTime: end,
		lastModifiedTime: '2026-10-30T09:00:00Z',
		geography: { type: 'Point', coordinates: [lon, lat] },
		...more
	});

	it('keeps a disruption within reach of the place, as facts kept by TfL, comments as found', () => {
		const facts = disruptionFacts(
			[disruption('T1', 51.3805, -0.07, '2026-11-03T18:00:00Z')],
			at,
			'2026-10-31T12:00:00Z'
		);
		const claim = (key: string) => facts.find((f) => f.claim.key === key)?.claim.value;
		expect(facts.every((f) => f.source === 'TfL' && f.subject === 'tfl/T1')).toBe(true);
		expect(claim('comments')).toBe(
			'[A999] Invented Road (Both directions) - Temporary lights in operation. '
		);
		expect(claim('category')).toBe('Works');
		expect(claim('end')).toBe('2026-11-03T18:00:00Z');
		expect(Number(claim('metres'))).toBeLessThan(200);
		expect(facts[0].observed).toBe('2026-10-30');
	});

	it('leaves out one too far off, and one already over', () => {
		const facts = disruptionFacts(
			[
				disruption('far', 51.39, -0.07, '2026-11-03T18:00:00Z'),
				disruption('over', 51.38, -0.07, '2026-10-30T18:00:00Z')
			],
			at,
			'2026-10-31T12:00:00Z'
		);
		expect(facts).toEqual([]);
	});

	it('finds one by its street, where its point lies further off', () => {
		const facts = disruptionFacts(
			[
				disruption('street', 51.39, -0.07, '2026-11-03T18:00:00Z', {
					streets: [{ segments: [{ lineString: '[[-0.0701,51.3801],[-0.075,51.385]]' }] }]
				})
			],
			at,
			'2026-10-31T12:00:00Z'
		);
		expect(facts.length).toBeGreaterThan(0);
	});
});

describe('arrivalFacts', () => {
	it('makes each predicted arrival facts about that arrival, from TfL, observed now', () => {
		const facts = arrivalFacts(
			[
				{
					id: 'a1',
					lineName: '410',
					destinationName: 'Invented Palace',
					timeToStation: 185,
					modeName: 'bus'
				},
				{
					id: 'a2',
					lineName: 'Tram',
					destinationName: 'Inventon',
					timeToStation: 40,
					modeName: 'tram'
				}
			],
			'Invented Tram Stop',
			'2026-10-25T20:15:00Z'
		);
		expect(facts.filter((f) => f.subject === 'tfl/a1').map((f) => f.claim)).toEqual([
			{ key: 'line', value: '410' },
			{ key: 'destination', value: 'Invented Palace' },
			{ key: 'due', value: '185' },
			{ key: 'mode', value: 'bus' },
			{ key: 'stop', value: 'Invented Tram Stop' }
		]);
		expect(facts[0]).toMatchObject({ source: 'TfL', observed: '2026-10-25T20:15:00Z' });
	});

	it('leaves out an arrival with nothing to say', () => {
		expect(arrivalFacts([{ id: 'a3' }], 'Somewhere', '2026-10-25T20:15:00Z')).toEqual([]);
	});
});
