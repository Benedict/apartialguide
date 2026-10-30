import { describe, expect, it } from 'vitest';
import { loadConsent, saveConsent, startAnalytics, track } from './analytics';

const memory = () => {
	const kept = new Map<string, string>();
	return {
		getItem: (k: string) => kept.get(k) ?? null,
		setItem: (k: string, v: string) => void kept.set(k, v)
	};
};

/** A page with nothing in it, enough to see what would be added and sent. */
const page = () => {
	const added: { src: string; async: boolean }[] = [];
	const win: { dataLayer?: unknown[] } = {};
	const doc = {
		createElement: () => ({ src: '', async: false }),
		head: { append: (el: { src: string; async: boolean }) => void added.push(el) }
	};
	return { added, win, doc };
};

describe('consent', () => {
	it('is not given until the reader gives it', () => {
		expect(loadConsent(memory())).toBeUndefined();
	});

	it('keeps the reader’s answer, yes or no', () => {
		const store = memory();
		saveConsent('granted', store);
		expect(loadConsent(store)).toBe('granted');
		saveConsent('denied', store);
		expect(loadConsent(store)).toBe('denied');
	});

	it('asks again where the browser keeps nothing', () => {
		const broken = {
			getItem: () => {
				throw new Error('no storage');
			},
			setItem: () => {
				throw new Error('no storage');
			}
		};
		expect(() => saveConsent('granted', broken)).not.toThrow();
		expect(loadConsent(broken)).toBeUndefined();
	});
});

describe('Google Analytics', () => {
	it('loads once, for the measurement ID given, and counts nothing before', () => {
		const { added, win, doc } = page();
		track('command', { verb: 'go' }, win);
		expect(win.dataLayer).toBeUndefined();
		startAnalytics('G-TEST123', { doc, win });
		startAnalytics('G-TEST123', { doc, win });
		expect(added).toEqual([
			{ src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123', async: true }
		]);
		track('command', { verb: 'go' }, win);
		const sent = (win.dataLayer ?? []).map((args) => [...(args as IArguments)]);
		expect(sent.at(-1)).toEqual(['event', 'command', { verb: 'go' }]);
		expect(sent).toContainEqual(['config', 'G-TEST123']);
	});
});
