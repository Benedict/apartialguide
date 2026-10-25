import { describe, expect, it } from 'vitest';
import { recordSentences } from './records';

describe('recordSentences', () => {
	it('says a food hygiene rating and when it was given', () => {
		expect(recordSentences({ 'hygiene:rating': '5', 'hygiene:date': '2024-03-01' })).toEqual([
			'Its food hygiene rating is 5, given in March 2024.'
		]);
	});

	it('quotes a rating that is not a number exactly as found', () => {
		expect(recordSentences({ 'hygiene:rating': 'AwaitingInspection' })).toEqual([
			'Its food hygiene rating: “AwaitingInspection”.'
		]);
	});

	it('says nothing of sources it has no words for', () => {
		expect(recordSentences({ 'mystery:x': '1' })).toEqual([]);
	});
});
