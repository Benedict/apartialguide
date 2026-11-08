import { describe, expect, it } from 'vitest';
import { aside, hearsay } from './hearsay';
import { recordSentences } from './records';

describe('recordSentences', () => {
	it('says a food hygiene rating and when it was given', () => {
		expect(recordSentences({ 'hygiene:rating': '5', 'hygiene:date': '2024-03-01' })).toEqual([
			'Its food hygiene rating is 5, given in March 2024.'
		]);
	});

	it('gives a rating that is not a number in words, as the inspectors’ codes are read', () => {
		expect(recordSentences({ 'hygiene:rating': 'AwaitingInspection' })).toEqual([
			'Its food hygiene rating: awaiting inspection.'
		]);
		expect(recordSentences({ 'hygiene:rating': 'Exempt' })).toEqual([
			'Its food hygiene rating: exempt.'
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
		expect(
			recordSentences({
				'price:since': '2020',
				'price:sales': '8',
				'price:low': '400000',
				'price:high': '550000'
			})
		).toEqual(['Most houses here have sold for between £400,000 and £550,000 since 2020.']);
		expect(
			recordSentences({
				'price:since': '2020',
				'price:sales': '5',
				'price:low': '400000',
				'price:high': '400000'
			})
		).toEqual(['Most houses here have sold for around £400,000 since 2020.']);
		// A sale at an address, as kept before, is no longer told.
		expect(recordSentences({ 'price:sold': '412000', 'price:date': '2019-03-08' })).toEqual([]);
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
	it('counts the trees along a street, by their names as found, as hearsay', () => {
		expect(
			recordSentences({ 'trees:count': '3', 'trees:kinds': 'London plane (2), Lime (1)' })
		).toEqual([`3 trees along it, ${aside('3 trees along it')}: London plane (2), Lime (1).`]);
		expect(recordSentences({ 'trees:count': '1', 'trees:kinds': 'Cherry (1)' })).toEqual([
			`1 tree along it, ${aside('1 tree along it')}: Cherry (1).`
		]);
	});
});

describe('recordSentences, newer accounts', () => {
	it('says when a living thing was seen', () => {
		expect(recordSentences({ 'wildlife:seen': '2021-06' }, 'room')).toEqual([
			'Seen here in June 2021.'
		]);
	});

	it('gives what a mine raised, year by year, on the thing the returns go with', () => {
		expect(
			recordSentences(
				{
					'returns:mine': 'Invented Law',
					'returns:1872.ore': '7 tons',
					'returns:1872.lead': '5 tons 1 cwts'
				},
				'room'
			)
		).toEqual([
			hearsay(
				'of Invented Law, the returns for 1872 give 7 tons of lead ore and 5 tons 1 cwts of lead'
			)
		]);
	});

	it('says how deep a borehole goes and the year it is on record from', () => {
		expect(
			recordSentences({ 'borehole:depth': '117.35', 'borehole:year': '1956' }, 'room')
		).toEqual(['117.35 metres deep, on record from 1956.']);
		expect(recordSentences({ 'borehole:depth': '30' }, 'room')).toEqual(['30 metres deep.']);
	});

	it('says when a postcode was in use', () => {
		expect(
			recordSentences({ 'postcode:began': '1980-01', 'postcode:ended': '1998-06' }, 'room')
		).toEqual(['In use from January 1980 to June 1998.']);
	});

	it('names the companies registered at an address, on a closer look', () => {
		expect(
			recordSentences({
				'company:count': '1',
				'company:names': 'INVENTED LTD',
				'company:since': '2019-05-02'
			})
		).toEqual([hearsay('a company is registered here: “INVENTED LTD”, since May 2019')]);
		expect(
			recordSentences({
				'company:count': '7',
				'company:names': 'A LTD|B LTD|C LTD',
				'company:since': '2004-01-09'
			})
		).toEqual([
			hearsay(
				'seven companies are registered here, the first since January 2004: “A LTD”, “B LTD”, “C LTD” and others'
			)
		]);
		expect(recordSentences({ 'company:count': '1', 'company:names': 'X' }, 'room')).toEqual([]);
	});
});

describe('recordSentences, keyed accounts', () => {
	it('says when a house was built, by its certificate, on a closer look', () => {
		expect(
			recordSentences({ 'epc:built': '1900-1929', 'epc:rating': 'D', 'epc:lodged': '2019-03-14' })
		).toEqual([hearsay('it was built 1900-1929, and rated D for energy in March 2019')]);
		expect(recordSentences({ 'epc:rating': 'D', 'epc:lodged': '2019-03-14' })).toEqual([
			hearsay('it was rated D for energy in March 2019')
		]);
		expect(recordSentences({ 'epc:built': '1900-1929' }, 'room')).toEqual([]);
	});

	it('says when a photograph was taken', () => {
		expect(recordSentences({ 'geograph:taken': '2009-05' }, 'room')).toEqual([
			'Taken in May 2009.'
		]);
	});
});

describe('recordSentences, in a room', () => {
	it('keeps to the short sayings in a room, and tells the rest on a closer look', () => {
		const tags = {
			'hygiene:rating': '5',
			'planning:application': 'Invented extension',
			'price:since': '2020',
			'price:sales': '5',
			'price:low': '400000',
			'price:high': '450000'
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
