/**
 * The news function: asks GDELT for the day's news that names the map's own place, keeps the
 * headlines alone (no outlet, no link: Guide names no source), leaves out those that tell of death or
 * crime, and passes them on for the page to read. Its answer is kept a quarter of an hour at the edge,
 * so GDELT, which asks for no more than one request every five seconds, is seldom asked at all.
 * It asks about one fixed place only.
 */
export interface NewsConfig {
	/** The place the news must name, such as Croydon. */
	PLACE: string;
	/** The site allowed to read the answer. */
	ALLOWED_ORIGIN: string;
}

/** Headlines Guide will not tell: of death, violence, crime and the courts. Whole words only. */
const TROUBLING = new RegExp(
	`\\b(${[
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
	].join('|')})\\b`,
	'i'
);

/** Whether a headline is one Guide may tell. */
export const untroubling = (title: string) => !TROUBLING.test(title);

/** At most this many headlines are passed on; Guide tells fewer. */
const MOST = 5;

interface GdeltArticle {
	title?: string;
	seendate?: string;
}

export async function newsHandler(
	request: Request,
	config: NewsConfig,
	get: (url: string) => Promise<Response> = fetch
): Promise<Response> {
	const headers = {
		'Access-Control-Allow-Origin': config.ALLOWED_ORIGIN,
		'Content-Type': 'application/json',
		'Cache-Control': 'public, max-age=900',
		// Kept at the edge for a quarter of an hour, and served a little longer while it is asked again.
		'Netlify-CDN-Cache-Control': 'public, max-age=900, stale-while-revalidate=300'
	};
	if (request.method !== 'GET') return new Response(null, { status: 405, headers });
	const query = new URLSearchParams({
		query: `"${config.PLACE}" sourcelang:english`,
		mode: 'artlist',
		format: 'json',
		maxrecords: '25',
		timespan: '1d',
		sort: 'datedesc'
	});
	try {
		const res = await get(`https://api.gdeltproject.org/api/v2/doc/doc?${query}`);
		if (!res.ok) throw new Error(`GDELT answered ${res.status}`);
		const answer = (await res.json()) as { articles?: GdeltArticle[] };
		const seen = new Set<string>();
		const articles = (answer.articles ?? [])
			.map((a) => ({ title: (a.title ?? '').trim(), seendate: a.seendate ?? '' }))
			.filter((a) => a.title && untroubling(a.title))
			.filter((a) => !seen.has(a.title.toLowerCase()) && seen.add(a.title.toLowerCase()))
			.slice(0, MOST)
			.map((a) => ({
				title: a.title,
				seen: `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}`
			}));
		return new Response(JSON.stringify({ place: config.PLACE, articles }), { headers });
	} catch {
		return new Response(JSON.stringify({ error: 'no answer from GDELT' }), {
			status: 502,
			headers
		});
	}
}
