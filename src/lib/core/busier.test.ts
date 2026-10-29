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

	it('passes over a stop of plain things only', () => {
		expect(isBusier(scene([beat({ building: 'yes' }), beat({ natural: 'tree' })]))).toBe(false);
		expect(isBusier(scene([]))).toBe(false);
	});
});
