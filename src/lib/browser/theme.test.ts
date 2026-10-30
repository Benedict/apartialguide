import { describe, expect, it } from 'vitest';
import { applyTheme, loadTheme, saveTheme } from './theme';

const memory = () => {
	const kept = new Map<string, string>();
	return {
		getItem: (k: string) => kept.get(k) ?? null,
		setItem: (k: string, v: string) => void kept.set(k, v)
	};
};

describe('the reader’s colours', () => {
	it('keeps the reader’s choice, and is the page as it is until they choose', () => {
		const store = memory();
		expect(loadTheme(store)).toBe('paper');
		saveTheme('amber', store);
		expect(loadTheme(store)).toBe('amber');
	});

	it('forgets a colour it does not know, and a browser that keeps nothing', () => {
		const store = memory();
		store.setItem('a-partial-guide:theme', 'purple');
		expect(loadTheme(store)).toBe('paper');
		expect(loadTheme(undefined)).toBe('paper');
		expect(() => saveTheme('green', undefined)).not.toThrow();
	});

	it('puts the colours on the page, and takes them off for paper', () => {
		const root = { dataset: {} as Record<string, string> };
		applyTheme('green', root);
		expect(root.dataset.theme).toBe('green');
		applyTheme('paper', root);
		expect(root.dataset.theme).toBeUndefined();
	});
});
