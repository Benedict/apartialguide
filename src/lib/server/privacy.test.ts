import { describe, expect, it } from 'vitest';
import { unhashedScripts } from './csp-check';
import { privacyPage } from './privacy';
import { structureFaults } from './structure';

const words = (html: string) =>
	html
		.replace(/<style>[^]*?<\/style>/, '')
		.replace(/<script>[^]*?<\/script>/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ');

describe('privacyPage', () => {
	const plain = privacyPage({ date: '2026-10-31' });
	const counted = privacyPage({
		date: '2026-10-31',
		gaId: 'G-TEST',
		signupUrl: 'https://example.org/signup',
		contact: 'someone@example.org'
	});

	it('says plainly that nothing is asked of the reader and their position never is', () => {
		expect(words(plain)).toContain('no account');
		expect(words(plain)).toContain('never asks where you are');
	});

	it('names what the page keeps in the reader’s browser, and that it never leaves it', () => {
		for (const kept of ['saved walks', 'colours', 'Settings', 'hints'])
			expect(words(plain)).toContain(kept);
		expect(words(plain)).toContain('never sent to us');
	});

	it('says a typed postcode or place is looked up in the page alone', () => {
		expect(words(plain)).toMatch(/postcode[^.]*in the page itself/);
	});

	it('names each live source asked from the reader’s browser, and that each can be turned off', () => {
		for (const name of ['Open-Meteo', 'Transport for London', 'OpenFreeMap', 'CelesTrak'])
			expect(words(plain)).toContain(name);
		expect(words(plain)).toContain('your IP address');
		expect(plain).toContain('href="/walk/#settings"');
	});

	it('says the aircraft and the news are asked through the site’s own functions, not the reader’s browser', () => {
		expect(words(plain)).toContain(
			'The aircraft overhead and the day’s news are asked through this site’s own functions'
		);
		expect(words(plain)).toContain('GDELT');
		expect(words(plain)).toContain('works and closures on the roads');
	});

	it('without analytics, says nothing is counted; with it, what is counted and only after a yes', () => {
		expect(words(plain)).toContain('Nothing is counted');
		expect(words(plain)).not.toContain('Google Analytics');
		expect(words(counted)).toContain('Google Analytics');
		expect(words(counted)).toContain('never what you type');
		expect(words(counted)).toContain('only after you say yes');
	});

	it('speaks of the mailing list only where there is one', () => {
		expect(words(plain)).not.toContain('mailing list');
		expect(words(counted)).toContain('mailing list');
		expect(counted).toContain('href="https://example.org/signup"');
	});

	it('gives the reader their rights, and an address to write to where one is set', () => {
		expect(words(plain)).toContain('UK GDPR');
		expect(counted).toContain('href="mailto:someone@example.org"');
		expect(plain).not.toContain('mailto:');
	});

	it('is dated, and says who is responsible', () => {
		expect(words(plain)).toContain('31 October 2026');
		expect(words(plain)).toContain('Benedict');
	});

	it('can be read by everyone and runs only the scripts it was built with', () => {
		expect(structureFaults(plain)).toEqual([]);
		expect(unhashedScripts(counted)).toEqual([]);
	});

	it('names its own address once the site knows it', () => {
		expect(privacyPage({ date: '2026-10-31', siteUrl: 'https://x.test' })).toContain(
			'<link rel="canonical" href="https://x.test/privacy/">'
		);
	});
});
