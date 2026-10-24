import { describe, expect, it } from 'vitest';
import { fixedClock } from './facts';
import { detectTensions } from './tensions';
import { facts } from './testing/facts';

const clock = fixedClock('2026-10-24');
const street = facts('way/1', { highway: 'residential', name: 'A Street' });

describe('detectTensions', () => {
	it('finds a broken name', () => {
		const found = detectTensions([...street, ...facts('way/2', { old_name: 'est Bank' })], clock);
		expect(found).toContainEqual(expect.objectContaining({ kind: 'fragment', subject: 'way/2' }));
	});

	it('leaves whole names alone', () => {
		const found = detectTensions([...street, ...facts('way/2', { name: 'The Bank' })], clock);
		expect(found.filter((t) => t.kind === 'fragment')).toEqual([]);
	});

	it('finds an old observation', () => {
		const shop = facts(
			'node/3',
			{ shop: 'bakery' },
			{ observed: '2018-10-04', observedBy: 'survey' }
		);
		expect(detectTensions([...street, ...shop], clock)).toContainEqual({
			kind: 'dated',
			subject: 'node/3',
			observed: '2018-10-04'
		});
	});

	it('does not date a recent observation', () => {
		const shop = facts('node/3', { shop: 'bakery' }, { observed: '2024-10-04' });
		expect(detectTensions([...street, ...shop], clock).filter((t) => t.kind === 'dated')).toEqual(
			[]
		);
	});

	it('does not date the street underfoot', () => {
		const old = facts('way/1', { highway: 'residential' }, { observed: '2010-01-01' });
		expect(detectTensions(old, clock).filter((t) => t.kind === 'dated')).toEqual([]);
	});

	it('counts a bus stop beside the street as a feature, not as street', () => {
		const stop = facts('node/5', { highway: 'bus_stop', name: 'Weir Steps' });
		expect(detectTensions([...street, ...stop], clock)).not.toContainEqual({ kind: 'sparse' });
	});

	it('calls a stop with nothing but street sparse', () => {
		expect(detectTensions(street, clock)).toContainEqual({ kind: 'sparse' });
	});

	it('calls a stop crowded with features dense', () => {
		const many = Array.from({ length: 8 }, (_, i) =>
			facts(`node/${i + 10}`, { amenity: 'bench' })
		).flat();
		expect(detectTensions([...street, ...many], clock)).toContainEqual({ kind: 'dense' });
	});
});

describe('detectTensions with history', () => {
	const history = { source: 'osm-history', observed: '2017-01-01' };

	it('finds something gone from the map', () => {
		const gone = facts('node/7', { 'was:shop': 'bakery', 'was:name': 'Crumb' }, history);
		expect(detectTensions([...street, ...gone], clock)).toContainEqual({
			kind: 'gone',
			subject: 'node/7',
			asOf: '2017-01-01'
		});
	});

	it('finds a place that was called something else', () => {
		const pub = [
			...facts('node/8', { amenity: 'pub', name: 'The Sextant' }, { observed: '2025-01-01' }),
			...facts('node/8', { 'was:name': 'The Anchor' }, history)
		];
		expect(detectTensions([...street, ...pub], clock)).toContainEqual({
			kind: 'renamed',
			subject: 'node/8',
			names: [{ name: 'The Anchor', asOf: '2017-01-01' }]
		});
	});

	it('does not count a history date as an out-of-date record', () => {
		const pub = [
			...facts('node/8', { amenity: 'pub', name: 'The Sextant' }, { observed: '2025-01-01' }),
			...facts('node/8', { 'was:name': 'The Anchor' }, history)
		];
		const gone = facts('node/7', { 'was:shop': 'bakery' }, history);
		const found = detectTensions([...street, ...gone, ...pub], clock);
		expect(found.filter((t) => t.kind === 'dated')).toEqual([]);
	});
});
