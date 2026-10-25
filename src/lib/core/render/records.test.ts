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

describe('recordSentences, other sources', () => {
	it('says a listing, a plan, a plaque and a sale', () => {
		expect(recordSentences({ 'listed:grade': 'II', 'listed:listed': '1973-03-01' })).toEqual([
			'Listed, grade II, in March 1973.'
		]);
		expect(
			recordSentences({
				'planning:application': 'Change of use',
				'planning:decision': 'Approved',
				'planning:date': '2023-03-14'
			})
		).toEqual(['In March 2023, an application: “Change of use”. It was “Approved”.']);
		expect(recordSentences({ 'plaque:inscription': 'Ada Inventa lived here' })).toEqual([
			'A plaque: “Ada Inventa lived here”.'
		]);
		expect(recordSentences({ 'price:sold': '412000', 'price:date': '2019-03-08' })).toEqual([
			'Sold for £412,000 in March 2019.'
		]);
	});

	it('says what was reported on or near a street', () => {
		expect(
			recordSentences({
				'crime:month': '2026-08',
				'crime:reports': '3',
				'crime:kinds': 'anti-social behaviour (2), burglary (1)'
			})
		).toEqual([
			'In August 2026, 3 reports on or near it: anti-social behaviour (2), burglary (1).'
		]);
	});
});

describe('recordSentences, trees', () => {
	it('counts the trees along a street, by their names as found', () => {
		expect(
			recordSentences({ 'trees:count': '3', 'trees:kinds': 'London plane (2), Lime (1)' })
		).toEqual(['3 trees along it, by the borough’s count: London plane (2), Lime (1).']);
		expect(recordSentences({ 'trees:count': '1', 'trees:kinds': 'Cherry (1)' })).toEqual([
			'1 tree along it, by the borough’s count: Cherry (1).'
		]);
	});
});

describe('recordSentences, in a room', () => {
	it('keeps to the short sayings in a room, and tells the rest on a closer look', () => {
		const tags = {
			'hygiene:rating': '5',
			'planning:application': 'Invented extension',
			'price:sold': '412000'
		};
		expect(recordSentences(tags, 'room')).toEqual(['Its food hygiene rating is 5.']);
		expect(recordSentences(tags)).toHaveLength(3);
	});
});

describe('recordSentences, quoting', () => {
	it('does not add a full stop after a quotation that ends with its own', () => {
		expect(recordSentences({ 'planning:application': 'Invented sign.' })).toEqual([
			'An application: “Invented sign.”'
		]);
		expect(recordSentences({ 'plaque:inscription': 'Ada Inventa lived here!' })).toEqual([
			'A plaque: “Ada Inventa lived here!”'
		]);
	});
});
