import { describe, expect, it } from 'vitest';
import { isBusier } from './busier';
import { facts } from './testing/facts';
import type { Scene } from './scene';

const scene = (beats: Scene['beats']): Scene =>
	({
		stopId: 's',
		street: [],
		beats,
		hidden: [],
		mood: 'plain',
		position: [0, 0],
		kind: 'corridor',
		here: [],
		exits: []
	}) as Scene;
const beat = (
	tags: Record<string, string>,
	more: { elsewhere?: boolean; history?: boolean; effects?: string[] } = {}
) => ({
	subject: 'x',
	facts: facts('x', tags).map((f) =>
		more.elsewhere
			? { ...f, elsewhere: true as const }
			: more.history
				? { ...f, source: 'osm-history' }
				: f
	),
	effects: (more.effects ?? []) as never
});

describe('isBusier: a stop whose data has something going on', () => {
	it('counts a named thing, another account, something gone, or a broken name', () => {
		expect(isBusier(scene([beat({ shop: 'bakery', name: 'Inventa Bakes' })]))).toBe(true);
		expect(isBusier(scene([beat({ 'hygiene:rating': '5' }, { elsewhere: true })]))).toBe(true);
		expect(isBusier(scene([beat({ 'was:shop': 'bank' }, { history: true })]))).toBe(true);
		expect(isBusier(scene([beat({ building: 'yes' }, { effects: ['spoken-as-found'] })]))).toBe(
			true
		);
	});

	it('passes over a stop whose only other account is an ended postcode, and counts it with anything more', () => {
		const ended = beat(
			{ 'postcode:name': 'ZZ9 9ZZ', 'postcode:kind': 'postcode', 'postcode:ended': '1990-12' },
			{ elsewhere: true }
		);
		expect(isBusier(scene([ended]))).toBe(false);
		expect(isBusier(scene([ended, beat({ building: 'yes' })]))).toBe(false);
		expect(isBusier(scene([ended, beat({ shop: 'bakery', name: 'Inventa Bakes' })]))).toBe(true);
		expect(isBusier(scene([ended, beat({ 'hygiene:rating': '5' }, { elsewhere: true })]))).toBe(
			true
		);
	});

	it('passes over a stop of plain things only', () => {
		expect(isBusier(scene([beat({ building: 'yes' }), beat({ natural: 'tree' })]))).toBe(false);
		expect(isBusier(scene([]))).toBe(false);
	});

	it('passes over a park, golf course or wood the stop is in or beside, its other accounts too', () => {
		const ground = (tags: Record<string, string>) =>
			scene(
				[beat(tags), beat({ description: 'park in Inventa' }, { elsewhere: true })].slice(0, 1)
			);
		expect(isBusier(ground({ leisure: 'park', name: 'Inventa Fields' }))).toBe(false);
		expect(isBusier(ground({ leisure: 'golf_course', name: 'Inventa Golf Club' }))).toBe(false);
		expect(isBusier(ground({ natural: 'wood', name: 'Inventa Wood' }))).toBe(false);
		const described = {
			subject: 'park',
			facts: [
				...facts('park', { leisure: 'park', name: 'Inventa Fields' }),
				...facts('park', { description: 'park in Inventa' }).map((f) => ({
					...f,
					elsewhere: true as const
				}))
			],
			effects: [] as never
		};
		expect(isBusier(scene([described]))).toBe(false);
	});

	it('still counts the stop for what else is there beside the park', () => {
		expect(
			isBusier(
				scene([
					beat({ leisure: 'park', name: 'Inventa Fields' }),
					beat({ amenity: 'place_of_worship', name: 'Inventa Chapel' })
				])
			)
		).toBe(true);
	});
});
