import { describe, expect, it } from 'vitest';
import { browserSaves } from './saves';
import type { SavedWalk } from '../core/adventure/saves';

const walk = { version: 1, map: 'm', place: 'Long Street' } as SavedWalk;
const memory = () => {
	const kept = new Map<string, string>();
	return {
		kept,
		getItem: (k: string) => kept.get(k) ?? null,
		setItem: (k: string, v: string) => void kept.set(k, v)
	};
};

describe('browserSaves', () => {
	it('keeps each slot under its own key in the browser', () => {
		const store = memory();
		const saves = browserSaves(store)!;
		saves.put('2', walk);
		expect(store.kept.get('a-partial-guide:save:2')).toBe(JSON.stringify(walk));
		expect(saves.get('2')).toEqual(walk);
		expect(saves.get('3')).toBeUndefined();
	});

	it('reads a garbled slot as empty', () => {
		const store = memory();
		store.setItem('a-partial-guide:save:1', '{not json');
		expect(browserSaves(store)!.get('1')).toBeUndefined();
	});

	it('is nothing when the browser keeps nothing', () => {
		expect(browserSaves(undefined)).toBeUndefined();
		const refusing = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		};
		expect(browserSaves(refusing)).toBeUndefined();
	});
});
