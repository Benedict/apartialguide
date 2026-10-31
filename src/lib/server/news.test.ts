import { describe, expect, it } from 'vitest';
import { newsHandler, untroubling } from './news';

const config = { PLACE: 'Inventon', ALLOWED_ORIGIN: 'https://invented.example' };
// Invented headlines about an invented place.
const upstream = {
	articles: [
		{
			title: 'Inventon library opens its new reading room',
			seendate: '20261031T090000Z',
			url: 'https://news.example/1',
			domain: 'news.example'
		},
		{
			title: 'Inventon library opens its new reading room',
			seendate: '20261031T091500Z',
			url: 'https://other.example/1',
			domain: 'other.example'
		},
		{ title: 'Man stabbed in Inventon high street', seendate: '20261031T080000Z' },
		{ title: 'Inventon market returns for the winter', seendate: '20261031T070000Z' }
	]
};

describe('untroubling (the news Guide will tell)', () => {
	it('leaves out headlines that tell of death or crime, by whole words, in any case', () => {
		for (const word of [
			'killed',
			'kill',
			'dies',
			'died',
			'death',
			'dead',
			'murder',
			'stab',
			'stabbed',
			'stabbing',
			'shot',
			'shooting',
			'rape',
			'assault',
			'attack',
			'arrested',
			'charged',
			'jailed',
			'court',
			'police',
			'crash',
			'fatal',
			'body',
			'missing',
			'abuse',
			'terror'
		])
			expect(untroubling(`Inventon ${word.toUpperCase()} news`), word).toBe(false);
	});

	it('keeps ordinary news, and a listed word only inside another', () => {
		expect(untroubling('Inventon market returns for the winter')).toBe(true);
		expect(untroubling('Inventon shoot for a film')).toBe(true);
		expect(untroubling('Inventon courtyard reopens')).toBe(true);
	});
});

describe('newsHandler (the news function)', () => {
	it('asks GDELT for the day’s news of the map’s place, and passes on headlines alone', async () => {
		const asked: string[] = [];
		const res = await newsHandler(
			new Request('https://site.example/api/news'),
			config,
			async (url) => {
				asked.push(String(url));
				return new Response(JSON.stringify(upstream));
			}
		);
		expect(asked).toHaveLength(1);
		expect(asked[0]).toContain('https://api.gdeltproject.org/api/v2/doc/doc?');
		expect(new URL(asked[0]).searchParams.get('query')).toBe('"Inventon" sourcelang:english');
		expect(asked[0]).toContain('timespan=1d');
		expect(await res.json()).toEqual({
			place: 'Inventon',
			articles: [
				{ title: 'Inventon library opens its new reading room', seen: '2026-10-31' },
				{ title: 'Inventon market returns for the winter', seen: '2026-10-31' }
			]
		});
	});

	it('lets the page read it, and is kept a quarter of an hour, so GDELT is seldom asked', async () => {
		const res = await newsHandler(
			new Request('https://site.example/api/news'),
			config,
			async () => new Response(JSON.stringify(upstream))
		);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://invented.example');
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=900');
		expect(res.headers.get('Netlify-CDN-Cache-Control')).toBe(
			'public, max-age=900, stale-while-revalidate=300'
		);
	});

	it('answers 502 when GDELT does not, and only GET', async () => {
		const failed = await newsHandler(
			new Request('https://site.example/api/news'),
			config,
			async () => new Response('slow down', { status: 429 })
		);
		expect(failed.status).toBe(502);
		const posted = await newsHandler(
			new Request('https://site.example/api/news', { method: 'POST' }),
			config,
			fetch
		);
		expect(posted.status).toBe(405);
	});
});
