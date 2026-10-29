/**
 * The flights function: asks adsb.lol which aircraft are near the map's own place and passes the
 * answer on with the headers a page on another site needs to read it. adsb.lol sends none itself.
 * Deployed on its own as a FaaS (`functions/flights/`); the page is built with its URL (`FLIGHTS_URL`).
 * It asks about one fixed place only, so it cannot be used to ask about anywhere else.
 */
export interface FlightsConfig {
	LATITUDE: string;
	LONGITUDE: string;
	/** The site allowed to read the answer, such as https://benedict.github.io. */
	ALLOWED_ORIGIN: string;
	/** How far around the place to ask, in nautical miles. */
	RADIUS_NM?: string;
}

/** What the page needs of each aircraft, and nothing more. */
const KEEP = ['hex', 'flight', 'alt_baro', 'track', 'lat', 'lon'] as const;

export async function flightsHandler(
	request: Request,
	config: FlightsConfig,
	get: (url: string) => Promise<Response> = fetch
): Promise<Response> {
	const headers = {
		'Access-Control-Allow-Origin': config.ALLOWED_ORIGIN,
		'Content-Type': 'application/json',
		// Aircraft move; a quarter of a minute is as long as an answer stays true.
		'Cache-Control': 'public, max-age=15'
	};
	if (request.method !== 'GET') return new Response(null, { status: 405, headers });
	const lat = Number(config.LATITUDE);
	const lon = Number(config.LONGITUDE);
	const radius = Number(config.RADIUS_NM ?? 6);
	try {
		const res = await get(`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radius}`);
		if (!res.ok) throw new Error(`adsb.lol answered ${res.status}`);
		const answer = (await res.json()) as { ac?: Record<string, unknown>[] };
		const ac = (answer.ac ?? []).map((a) =>
			Object.fromEntries(KEEP.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]))
		);
		return new Response(JSON.stringify({ ac }), { headers });
	} catch {
		return new Response(JSON.stringify({ error: 'no answer from adsb.lol' }), {
			status: 502,
			headers
		});
	}
}
