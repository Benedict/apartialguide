import { describe, expect, it } from 'vitest';
import { browserHints } from './hints';

const memory = () => {
	const kept = new Map<string, string>();
	return {
		getItem: (k: string) => kept.get(k) ?? null,
		setItem: (k: string, v: string) => void kept.set(k, v)
	};
};

describe('browserHints', () => {
	it('keeps the hints given, the commands used and hints off, in this browser', () => {
		const store = memory();
		browserHints(store).save({ used: ['gps'], given: ['drift'], off: true });
		expect(browserHints(store).load()).toEqual({
			used: ['gps'],
			given: ['drift'],
			off: true
		});
	});

	it('starts afresh where the browser keeps nothing or kept something else', () => {
		const store = memory();
		store.setItem('a-partial-guide:hints', 'not json');
		expect(browserHints(store).load()).toEqual({ used: [], given: [], off: false });
		expect(browserHints(undefined).load()).toEqual({ used: [], given: [], off: false });
	});
});
