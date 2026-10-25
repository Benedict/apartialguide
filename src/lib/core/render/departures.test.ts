import { describe, expect, it } from 'vitest';
import { arrivalFacts } from '../adapters/tfl';
import { departuresLine } from './departures';

const at = '2026-10-25T20:15:00Z';

describe('departuresLine', () => {
	it('says the soonest three, by line and destination, in whole minutes', () => {
		const facts = arrivalFacts(
			[
				{
					id: '1',
					lineName: '289',
					destinationName: 'Invented End',
					timeToStation: 430,
					modeName: 'bus'
				},
				{
					id: '2',
					lineName: '410',
					destinationName: 'Invented Palace',
					timeToStation: 185,
					modeName: 'bus'
				},
				{
					id: '3',
					lineName: '312',
					destinationName: 'Invented Junction',
					timeToStation: 900,
					modeName: 'bus'
				},
				{
					id: '4',
					lineName: '410',
					destinationName: 'Invented Palace',
					timeToStation: 1500,
					modeName: 'bus'
				}
			],
			'Invented Road',
			at
		);
		expect(departuresLine(facts)).toBe(
			'Invented Road: the 410 to Invented Palace in 3 minutes, the 289 to Invented End in 7, the 312 to Invented Junction in 15.'
		);
	});

	it('calls a tram a tram, and one due within the minute due now', () => {
		const facts = arrivalFacts(
			[
				{
					id: '1',
					lineName: 'Tram',
					destinationName: 'Inventon',
					timeToStation: 40,
					modeName: 'tram'
				}
			],
			'Invented Tram Stop',
			at
		);
		expect(departuresLine(facts)).toBe('Invented Tram Stop: a tram to Inventon, due now.');
	});

	it('gives the unit with the first time in minutes, even after one due now', () => {
		const facts = arrivalFacts(
			[
				{
					id: '1',
					lineName: 'Tram',
					destinationName: 'Inventon',
					timeToStation: 40,
					modeName: 'tram'
				},
				{
					id: '2',
					lineName: 'Tram',
					destinationName: 'Elsewhere',
					timeToStation: 130,
					modeName: 'tram'
				}
			],
			'Invented Tram Stop',
			at
		);
		expect(departuresLine(facts)).toBe(
			'Invented Tram Stop: a tram to Inventon, due now, a tram to Elsewhere in 2 minutes.'
		);
	});

	it('says when nothing is due, and nothing at all without an answer', () => {
		expect(departuresLine([], 'Invented Road')).toBe('Invented Road: nothing is due.');
		expect(departuresLine([])).toBeUndefined();
	});
});
