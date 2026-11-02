import { createHash } from 'node:crypto';

/**
 * The page's Content Security Policy, as The Website Specification recommends: the scripts written in
 * the page run by their hashes alone, worked out from the page as built, and the only others are the
 * map's library (on gps) and, on a page that counts visits, Google's (once a reader says yes). The page asks only the places it
 * needs: today's weather and air, TfL, the cameras' pictures, the satellites' elements and the map's
 * tiles. Set in a meta tag, as the hashes change with every build; the header keeps others from
 * framing the page.
 */

const GOOGLE = [
	'https://*.google-analytics.com',
	'https://*.analytics.google.com',
	'https://*.googletagmanager.com'
];
const CAMERAS = 'https://s3-eu-west-1.amazonaws.com';
const TILES = 'https://tiles.openfreemap.org';
const CDN = 'https://cdn.jsdelivr.net';

/** The scripts the page runs from its own text: every inline script but a data block. */
function inlineScripts(html: string): string[] {
	return [...html.matchAll(/<script(\s[^>]*)?>([^]*?)<\/script>/g)]
		.filter(
			([, attrs = '']) => !/\ssrc=/.test(attrs) && !/type="application\/(ld\+)?json"/.test(attrs)
		)
		.map(([, , code]) => code);
}

const hash = (code: string) =>
	`'sha256-${createHash('sha256').update(code, 'utf8').digest('base64')}'`;

/** The page with its policy put straight after the charset, before anything it governs. */
export function withCsp(
	html: string,
	{
		flightsUrl,
		newsUrl,
		feedbackUrl,
		analytics,
		frames = []
	}: {
		flightsUrl?: string;
		newsUrl?: string;
		feedbackUrl?: string;
		analytics?: boolean;
		/** Forms the page may open in a frame, once the reader presses for one. */
		frames?: string[];
	} = {}
): string {
	const google = analytics ? GOOGLE.join(' ') : '';
	// The site's own functions, where one is served from another site (a URL rather than a path).
	const flights = [flightsUrl, newsUrl, feedbackUrl]
		.filter((u): u is string => !!u && /^https?:\/\//.test(u))
		.map((u) => new URL(u).origin);
	const policy = [
		"default-src 'self'",
		`script-src 'self' ${[...new Set(inlineScripts(html).map(hash))].join(' ')} ${CDN} ${analytics ? 'https://www.googletagmanager.com' : ''}`,
		`style-src 'self' 'unsafe-inline' ${CDN}`,
		`img-src 'self' data: blob: ${CAMERAS} ${TILES} ${google}`,
		"font-src 'self' data:",
		`connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://api.tfl.gov.uk ${CAMERAS} https://celestrak.org ${TILES} ${google}${flights.map((f) => ` ${f}`).join('')}`,
		'worker-src blob:',
		"manifest-src 'self'",
		...(frames.length
			? [`frame-src ${[...new Set(frames.map((f) => new URL(f).origin))].join(' ')}`]
			: []),
		"object-src 'none'",
		"base-uri 'none'",
		"form-action 'self'"
	]
		.map((d) => d.replace(/\s+/g, ' ').trim())
		.join('; ');
	return html.replace(
		/(<meta charset="utf-8">)/i,
		`$1\n<meta http-equiv="Content-Security-Policy" content="${policy}">`
	);
}
