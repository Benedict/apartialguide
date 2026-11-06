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
		for (const kept of ['saved walks', 'the line of each walk', 'colours', 'Settings', 'hints'])
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

	it('speaks of feedback only where the site takes it: what is sent, to whom, and that it is kept', () => {
		expect(words(plain)).not.toContain('feedback');
		expect(words(plain)).toContain('The site itself holds nothing about you');
		const open = words(privacyPage({ date: '2026-10-31', feedback: true }));
		expect(open).toContain('If you type feedback');
		expect(open).toContain('shown to you before it is sent');
		expect(open).toContain('kind of device');
		expect(open).toContain('never your full browser string');
		expect(open).toContain('private GitHub repository');
		expect(open).toContain('your IP address is used only to count how often');
		expect(open).toContain('an email address, if you give one');
		expect(open).not.toContain('The site itself holds nothing about you');
	});

	it('says how to have something about you taken out of the walk, and on what basis it is there', () => {
		const text = words(plain);
		expect(text).toContain('ask for it to be taken out');
		expect(text).toContain('within 7 days');
		expect(plain).toContain('href="/remove/"');
		expect(plain.match(/<footer>[^]*?<\/footer>/)![0]).toContain('href="/remove/"');
		expect(text).toMatch(/street’s range/);
		expect(text).toContain('legitimate interests');
	});

	it('says the site is Benedict’s own and Benedict is responsible for what it holds, not a company', () => {
		const text = words(plain);
		expect(text).toContain('Benedict’s own project');
		expect(text).toContain('the controller');
		expect(text).not.toMatch(/Limited|company registered/);
	});

	it('says why the address to write to is on another domain than the site’s', () => {
		const other = words(
			privacyPage({ contact: 'privacy@example.net', siteUrl: 'https://example.org' })
		);
		expect(other).toContain('Benedict’s own address, on another domain');
		const same = words(
			privacyPage({ contact: 'privacy@example.org', siteUrl: 'https://example.org' })
		);
		expect(same).not.toContain('another domain');
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

	it('says a Substack form opens only when pressed, and nothing reaches Substack before', () => {
		const page = words(privacyPage({ signupUrl: 'https://inventa.substack.com' }));
		expect(page).toContain('Substack');
		expect(page).toContain('nothing is sent to Substack until you press');
		expect(page).not.toContain('area not open yet');
	});
});
