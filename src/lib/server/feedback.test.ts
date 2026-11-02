import { describe, expect, it, vi } from 'vitest';
import type { Feedback } from '../core/adventure/feedback';
import { feedbackHandler, issueOf, Limiter } from './feedback';

const ORIGIN = 'https://site.example.org';
const valid: Feedback = {
	kind: 'bug',
	again: 'maybe',
	words: 'The map stops at the lane.',
	place: 'Invented Lane, east',
	moves: 3,
	map: '2026-10-29',
	device: 'phone',
	browser: 'Safari'
};
const post = (body: unknown, origin = ORIGIN) =>
	new Request(`${ORIGIN}/api/feedback`, {
		method: 'POST',
		headers: { Origin: origin, 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
const config = {
	TOKEN: 'secret',
	REPO: 'someone/somewhere',
	ALLOWED_ORIGIN: ORIGIN,
	visitor: 'v1'
};
const github = () => vi.fn(async () => new Response('{"number":7}', { status: 201 }));

describe('the feedback function', () => {
	it('files the feedback as an issue, labelled by its kind, with the token', async () => {
		const send = github();
		const res = await feedbackHandler(post(valid), config, { send });
		expect(res.status).toBe(201);
		const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.github.com/repos/someone/somewhere/issues');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
		const issue = JSON.parse(init.body as string);
		expect(issue.labels).toEqual(['feedback', 'bug']);
		expect(issue.title).toBe('Bug: The map stops at the lane.');
		expect(issue.body).toContain('> The map stops at the lane.');
		expect(issue.body).toContain('| Would walk again | maybe |');
		expect(issue.body).toContain('| Device | phone, Safari |');
	});

	it('mentions no one, whatever the words say', () => {
		const { title, body } = issueOf({ ...valid, words: 'Ask @someone\nabout it' });
		expect(title).not.toMatch(/@someone/);
		expect(body).not.toMatch(/@someone/);
		expect(body).toContain('> Ask @​someone\n> about it');
	});

	it('cuts a long title, keeping the words whole in the body', () => {
		const words = 'word '.repeat(40).trim();
		const { title, body } = issueOf({ ...valid, words });
		expect(title.length).toBeLessThanOrEqual(80);
		expect(title.endsWith('…')).toBe(true);
		expect(body).toContain(words);
	});

	it('takes only the choices the page offers, and words of a fair length', async () => {
		for (const bad of [
			{ ...valid, kind: 'complaint' },
			{ ...valid, again: 'often' },
			{ ...valid, words: '' },
			{ ...valid, words: 'x'.repeat(2001) },
			{ ...valid, device: 'watch' },
			{ ...valid, browser: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' },
			{ ...valid, map: 'yesterday' },
			{ ...valid, moves: -1 },
			{ ...valid, place: 'x'.repeat(201) }
		]) {
			const send = github();
			expect((await feedbackHandler(post(bad), config, { send })).status).toBe(400);
			expect(send).not.toHaveBeenCalled();
		}
	});

	it('answers a filled honeypot as if sent, and sends nothing', async () => {
		const send = github();
		const res = await feedbackHandler(post({ ...valid, website: 'spam.example' }), config, {
			send
		});
		expect(res.status).toBe(201);
		expect(send).not.toHaveBeenCalled();
	});

	it('refuses another site, and anything but a POST', async () => {
		const send = github();
		expect(
			(await feedbackHandler(post(valid, 'https://elsewhere.example'), config, { send })).status
		).toBe(403);
		expect(
			(await feedbackHandler(new Request(`${ORIGIN}/api/feedback`), config, { send })).status
		).toBe(405);
		expect(send).not.toHaveBeenCalled();
	});

	it('is closed without a token', async () => {
		const send = github();
		const res = await feedbackHandler(post(valid), { ...config, TOKEN: undefined }, { send });
		expect(res.status).toBe(503);
		expect(send).not.toHaveBeenCalled();
	});

	it('takes five from one visitor in an hour, then asks them to wait', async () => {
		const send = github();
		const limiter = new Limiter(5, 3_600_000, () => 0);
		for (let i = 0; i < 5; i++)
			expect((await feedbackHandler(post(valid), config, { send, limiter })).status).toBe(201);
		expect((await feedbackHandler(post(valid), config, { send, limiter })).status).toBe(429);
		expect(
			(await feedbackHandler(post(valid), { ...config, visitor: 'v2' }, { send, limiter })).status
		).toBe(201);
	});

	it('says so when GitHub does not take it', async () => {
		const send = vi.fn(async () => new Response('{}', { status: 422 }));
		expect((await feedbackHandler(post(valid), config, { send })).status).toBe(502);
	});
});
