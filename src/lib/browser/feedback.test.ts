import { describe, expect, it, vi } from 'vitest';
import { browserOf, deviceOf, sendFeedback } from './feedback';

const feedback = {
	kind: 'comment' as const,
	again: 'yes' as const,
	words: 'Lovely.',
	place: '',
	moves: 0
};

describe('the feedback the page sends', () => {
	it('tells the kind of device by the screen alone', () => {
		expect(deviceOf(390, true)).toBe('phone');
		expect(deviceOf(820, true)).toBe('tablet');
		expect(deviceOf(1440, false)).toBe('desktop');
		expect(deviceOf(1440, true)).toBe('desktop');
	});

	it('tells only the browser’s family, never the rest of what it says of itself', () => {
		const ua = {
			safari:
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
			chrome:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
			edge: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
			firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
			samsung:
				'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
			ios_chrome:
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
		};
		expect(browserOf(ua.safari)).toBe('Safari');
		expect(browserOf(ua.chrome)).toBe('Chrome');
		expect(browserOf(ua.edge)).toBe('Edge');
		expect(browserOf(ua.firefox)).toBe('Firefox');
		expect(browserOf(ua.samsung)).toBe('Samsung Internet');
		expect(browserOf(ua.ios_chrome)).toBe('Chrome');
		expect(browserOf('curl/8.0')).toBe('Other');
	});

	it('posts it to the site’s own function, with an empty honeypot, and says whether it went', async () => {
		const post = vi.fn(async () => new Response('{"ok":true}', { status: 201 }));
		expect(await sendFeedback('/api/feedback', feedback, post)).toBe(true);
		const [url, init] = post.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/feedback');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ ...feedback, website: '' });
		expect(
			await sendFeedback('/api/feedback', feedback, async () => new Response('', { status: 502 }))
		).toBe(false);
		expect(
			await sendFeedback('/api/feedback', feedback, async () =>
				Promise.reject(new Error('offline'))
			)
		).toBe(false);
		expect(await sendFeedback('', feedback, post)).toBe(false);
	});
});
