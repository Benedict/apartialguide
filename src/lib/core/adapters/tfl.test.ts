import { describe, expect, it } from 'vitest';
import { arrivalFacts } from './tfl';

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
