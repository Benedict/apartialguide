/**
 * The brand: a junction of three streets and a gap, the map's own drawing of a stop, turned until two
 * of its streets make the prompt's > and the gap trails off where the cursor would be; and the name
 * beside it, its letters traced from JetBrains Mono (SIL Open Font License) so they are shapes, the
 * same on every device, with no font to load.
 */

const INK = '#d4d4cc';
const BRIGHT = '#fff';

/** The mark's streets and stop, in a box from -50 to 50 each way. */
const STREETS = `<g stroke="${INK}" stroke-linecap="square" fill="none"><path d="M12 0 L-34 -30" stroke-width="10"/><path d="M12 0 L-34 30" stroke-width="10"/><path d="M12 0 L28 -11" stroke-width="10"/><path d="M20 6 L44 22" stroke-width="7" stroke-dasharray="6 5" stroke-linecap="butt"/></g><circle cx="12" cy="0" r="11" fill="${BRIGHT}"/>`;

/** The mark alone, on nothing. */
export const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">${STREETS}</svg>`;

/** The mark on the page's black, square, for an icon. */
export const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><rect x="-50" y="-50" width="100" height="100" fill="#000"/>${STREETS}</svg>`;

/** "A PARTIAL" over "GUIDE", traced. */
const NAME = `<path fill="${INK}" d="M3.6 34L0.8 34L4.8 17.9L8.4 17.9L12.4 34L9.6 34L8.7 30.1L4.5 30.1L3.6 34ZM5.9 23.5L5.0 27.9L8.2 27.9L7.3 23.6Q7.0 22.5 6.8 21.6Q6.7 20.7 6.6 20.3L6.6 20.3Q6.5 20.7 6.4 21.6Q6.2 22.5 5.9 23.5L5.9 23.5ZM34.8 34L32.1 34L32.1 17.9L37.4 17.9Q39.0 17.9 40.2 18.6Q41.4 19.2 42.1 20.3Q42.8 21.4 42.8 22.9L42.8 22.9Q42.8 24.4 42.1 25.5Q41.4 26.6 40.2 27.2Q39.0 27.8 37.4 27.8L37.4 27.8L34.8 27.8L34.8 34ZM34.8 20.4L34.8 25.4L37.4 25.4Q38.6 25.4 39.3 24.7Q40.0 24.0 40.0 22.9L40.0 22.9Q40.0 21.7 39.3 21.1Q38.6 20.4 37.4 20.4L37.4 20.4L34.8 20.4ZM49.2 34L46.4 34L50.4 17.9L54.0 17.9L58.0 34L55.2 34L54.3 30.1L50.1 30.1L49.2 34ZM51.5 23.5L50.6 27.9L53.8 27.9L52.9 23.6Q52.6 22.5 52.4 21.6Q52.3 20.7 52.2 20.3L52.2 20.3Q52.1 20.7 52.0 21.6Q51.8 22.5 51.5 23.5L51.5 23.5ZM65.2 34L62.5 34L62.5 17.9L67.6 17.9Q69.2 17.9 70.3 18.5Q71.5 19.1 72.2 20.2Q72.8 21.3 72.8 22.7L72.8 22.7Q72.8 24.3 72.0 25.5Q71.2 26.7 69.9 27.2L69.9 27.2L73.1 34L70.0 34L67.2 27.6L65.2 27.6L65.2 34ZM65.2 20.4L65.2 25.2L67.6 25.2Q68.7 25.2 69.4 24.6Q70.0 23.9 70.0 22.8L70.0 22.8Q70.0 21.7 69.4 21.0Q68.7 20.4 67.6 20.4L67.6 20.4L65.2 20.4ZM84.0 34L81.2 34L81.2 20.5L77.0 20.5L77.0 17.9L88.2 17.9L88.2 20.5L84.0 20.5L84.0 34ZM102.4 34L93.2 34L93.2 31.6L96.4 31.6L96.4 20.4L93.2 20.4L93.2 17.9L102.4 17.9L102.4 20.4L99.2 20.4L99.2 31.6L102.4 31.6L102.4 34ZM110.0 34L107.2 34L111.2 17.9L114.8 17.9L118.8 34L116.0 34L115.1 30.1L110.9 30.1L110.0 34ZM112.3 23.5L111.4 27.9L114.6 27.9L113.7 23.6Q113.4 22.5 113.2 21.6Q113.1 20.7 113 20.3L113 20.3Q112.9 20.7 112.8 21.6Q112.6 22.5 112.3 23.5L112.3 23.5ZM133.4 34L123.9 34L123.9 17.9L126.6 17.9L126.6 31.4L133.4 31.4L133.4 34Z"/><path fill="${BRIGHT}" d="M15.9 84.5L15.9 84.5Q12.0 84.5 9.2 83.1Q6.3 81.7 4.7 79.1Q3.1 76.5 3.1 73.1L3.1 73.1L3.1 57.0Q3.1 53.5 4.7 50.9Q6.3 48.4 9.2 46.9Q12.0 45.5 15.9 45.5L15.9 45.5Q19.7 45.5 22.5 46.9Q25.3 48.4 26.9 50.9Q28.5 53.5 28.5 57.0L28.5 57.0L20.7 57.0Q20.7 54.7 19.4 53.5Q18.1 52.3 15.8 52.3L15.8 52.3Q13.5 52.3 12.2 53.5Q10.9 54.7 10.9 57.0L10.9 57.0L10.9 73.1Q10.9 75.3 12.2 76.5Q13.5 77.8 15.8 77.8L15.8 77.8Q18.1 77.8 19.4 76.5Q20.7 75.3 20.7 73.1L20.7 73.1L20.7 69.8L15.1 69.8L15.1 63.2L28.5 63.2L28.5 73.1Q28.5 76.5 26.9 79.1Q25.3 81.7 22.5 83.1Q19.7 84.5 15.9 84.5ZM50.8 84.5L50.8 84.5Q45.0 84.5 41.7 81.4Q38.3 78.3 38.3 72.9L38.3 72.9L38.3 46.0L46.1 46.0L46.1 72.8Q46.1 75.2 47.3 76.5Q48.6 77.8 50.8 77.8L50.8 77.8Q53.0 77.8 54.2 76.5Q55.5 75.2 55.5 72.8L55.5 72.8L55.5 46.0L63.3 46.0L63.3 72.9Q63.3 78.2 59.9 81.4Q56.6 84.5 50.8 84.5ZM97.4 84L74.6 84L74.6 77.2L82.1 77.2L82.1 52.8L74.6 52.8L74.6 46.0L97.4 46.0L97.4 52.8L89.9 52.8L89.9 77.2L97.4 77.2L97.4 84ZM121.2 84L108.9 84L108.9 46.0L121.2 46.0Q125.2 46.0 128.1 47.5Q131.0 49.1 132.7 51.8Q134.3 54.5 134.3 58.2L134.3 58.2L134.3 71.8Q134.3 75.4 132.7 78.2Q131.0 80.9 128.1 82.5Q125.2 84 121.2 84L121.2 84ZM116.7 53.3L116.7 76.7L121.2 76.7Q123.6 76.7 125.0 75.4Q126.5 74.0 126.5 71.8L126.5 71.8L126.5 58.2Q126.5 56.0 125.0 54.7Q123.6 53.3 121.2 53.3L121.2 53.3L116.7 53.3ZM168.4 84L145.0 84L145.0 46.0L168.4 46.0L168.4 52.7L152.6 52.7L152.6 61.2L166.5 61.2L166.5 67.9L152.6 67.9L152.6 77.3L168.4 77.3L168.4 84Z"/>`;

/** The mark and the name together, for the front page and the About page. */
export const LOCKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 112" role="img" aria-label="A Partial Guide"><svg x="0" y="0" width="112" height="112" viewBox="-50 -50 100 100">${STREETS}</svg><g transform="translate(128 8)">${NAME}</g></svg>`;

/**
 * The page's icon, carried in the page (it plays from a single file too), and, where the site serves
 * them from `root`, the home-screen icon.
 */
export function faviconLinks(root?: string): string {
	const icon = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(ICON)}">`;
	return root ? `${icon}\n<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">` : icon;
}

/** The image shown where the site is shared, named in full as those who show it ask: only with the site's address. */
export function ogMeta(siteUrl?: string): string {
	if (!siteUrl) return '';
	const url = `${siteUrl.replace(/\/$/, '')}/og.png`;
	return `<meta property="og:image" content="${url}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">`;
}
