import { describe, expect, it } from 'vitest';
import { browserTrails, MOST_WALKS } from './trails';

const store = () => {
	const kept = new Map<string, string>();
	return {
		getItem: (k: string) => kept.get(k) ?? null,
		setItem: (k: string, v: string) => void kept.set(k, v)
	};
};

describe('the walks kept in the browser', () => {
	it('keeps every walk’s line between visits', () => {
		const s = store();
		browserTrails(s).put('a', [
			[51.38, -0.07],
			[51.381, -0.07]
		]);
		expect(browserTrails(s).load().get('a')).toEqual([
			[51.38, -0.07],
			[51.381, -0.07]
		]);
	});

	it('keeps the newest walks only, so it never fills the browser', () => {
		const s = store();
		const trails = browserTrails(s);
		for (let i = 0; i <= MOST_WALKS; i++) trails.put(`w${i}`, [[51.38, -0.07]]);
		const kept = browserTrails(s).load();
		expect(kept.size).toBe(MOST_WALKS);
		expect(kept.has('w0')).toBe(false);
	});

	it('keeps nothing, and fails nothing, where the browser keeps nothing', () => {
		const broken = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		};
		expect(() => browserTrails(broken).put('a', [[51.38, -0.07]])).not.toThrow();
		expect(browserTrails(broken).load().size).toBe(0);
		expect(browserTrails(undefined).load().size).toBe(0);
	});
});
