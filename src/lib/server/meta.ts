import { SOURCES } from '../site/sources';
export { REPO } from '../site/repo';

/**
 * What the site says of itself, beyond the page: its pages' descriptions and addresses, robots.txt,
 * the sitemap, llms.txt for agents, the web app manifest and structured data, as The Website
 * Specification recommends. Addresses are named only once the site knows its own (`SITE_URL`).
 */

const NAME = 'A Partial Guide';

/** The walk's own profiles elsewhere, linked from About and the front page, and named to search engines. */
export const PROFILES = [{ name: 'Instagram', href: 'https://www.instagram.com/apartialguide' }];

/** The profiles as links that say they are the site's own (rel="me"). */
export const profileLinks = () =>
	PROFILES.map((p) => `<a rel="me" href="${p.href}">${p.name}</a>`).join(' · ');

export interface Page {
	/** Where it lives on the site, or nothing for a page that is served for no address of its own. */
	path?: string;
	description: string;
}

/** The place a map is of, and the larger one it lies in, if any, as its descriptions name it. */
type Named = { name: string; within?: string };
const words = ({ name, within }: Named) => (within ? `${name}, in ${within}` : name);

export const homeDescription = (place: Named) =>
	`The world as a text adventure, built from open data. It starts with ${words(place)}.`;
export const walkDescription = (place: Named) =>
	`Walk ${words(place)}${place.within ? ',' : ''} as a text adventure: type a direction and go. Every street, building, name and date comes from open data.`;

const HERE = { name: 'Addiscombe', within: 'Croydon' };

export const PAGES = {
	home: { path: '/', description: homeDescription(HERE) },
	walk: { path: '/walk/', description: walkDescription(HERE) },
	privacy: {
		path: '/privacy/',
		description: 'What A Partial Guide keeps, what it sends and to whom: very little.'
	},
	missing: { description: 'There is no page here.' }
} satisfies Record<string, Page>;

/** The commands worth knowing first, each with what follows it, if anything. */
export const COMMANDS: [string[], string?][] = [
	[['n', 'se', 'back']],
	[['drift']],
	[['start anywhere']],
	[['place a glass']],
	[['look', 'examine', 'explore']],
	[['route to'], 'a street or a place'],
	[['gps on']],
	[['look up', 'use the camera']],
	[['news']],
	[['colour green']],
	[['save', 'restore', 'help']],
	[['feedback']]
];

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const at = (siteUrl: string, path: string) => `${siteUrl.replace(/\/$/, '')}${path}`;

/** The page's description, its colours, its address and its title for those who share it. */
export function headMeta({
	path,
	description,
	siteUrl,
	site
}: Page & { siteUrl?: string; site?: boolean }): string {
	const url = siteUrl && path ? at(siteUrl, path) : undefined;
	return [
		`<meta name="description" content="${esc(description)}">`,
		'<meta name="color-scheme" content="dark">',
		...(site ? ['<link rel="manifest" href="/site.webmanifest">'] : []),
		...(url ? [`<link rel="canonical" href="${url}">`] : []),
		`<meta property="og:title" content="${NAME}">`,
		`<meta property="og:description" content="${esc(description)}">`,
		'<meta property="og:type" content="website">',
		...(url ? [`<meta property="og:url" content="${url}">`] : [])
	].join('\n');
}

/** Every crawler welcome, and the sitemap named where the address is known. */
export const robotsTxt = (siteUrl?: string): string =>
	`User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${at(siteUrl, '/sitemap.xml')}\n` : ''}`;

/** The pages worth finding, dated by the map they are built from. */
export function sitemapXml(siteUrl: string, lastmod: string): string {
	const urls = [PAGES.home, PAGES.walk, PAGES.privacy]
		.map((p) => `  <url><loc>${at(siteUrl, p.path)}</loc><lastmod>${lastmod}</lastmod></url>`)
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** What the walk is, how it is played and where its words come from, for agents, in Markdown. */
export function llmsTxt(siteUrl = ''): string {
	const commands = COMMANDS.map(
		([words, rest]) => `- ${words.map((w) => `\`${w}\``).join(' ')}${rest ? ` ${rest}` : ''}`
	);
	const sources = SOURCES.map((s) => `- [${s.name}](${s.href}): ${s.gives}. ${s.terms}.`);
	return [
		`# ${NAME}`,
		'',
		`> ${PAGES.home.description}`,
		'',
		'A text adventure played in the browser. One narrator, Guide, describes each place from open data alone, and never invents a fact: every street, building, name and date comes from a dated copy of the map and the records others keep of the place. Where the data is broken, Guide speaks it as found.',
		'',
		'## Pages',
		'',
		`- [The walk](${siteUrl ? at(siteUrl, PAGES.walk.path) : PAGES.walk.path}): ${PAGES.walk.description}`,
		`- [About the walk](${siteUrl ? at(siteUrl, PAGES.home.path) : PAGES.home.path}): what it is, and how to begin.`,
		'',
		'## Playing',
		'',
		'Type a command at the prompt. The commands worth knowing first:',
		'',
		...commands,
		'',
		'## Where the words come from',
		'',
		...sources,
		''
	].join('\n');
}

/** The web app manifest: the walk can be added to a home screen, and opens at the prompt. */
export const manifest = (): string =>
	JSON.stringify(
		{
			name: NAME,
			short_name: NAME,
			description: PAGES.home.description,
			start_url: '/walk/',
			scope: '/',
			display: 'standalone',
			background_color: '#000000',
			theme_color: '#000000',
			icons: [
				{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
				{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
			]
		},
		null,
		2
	);

/** The site, or the walk, described to search engines as structured data: only what they are. */
export function jsonLd(page: 'home' | 'walk', siteUrl?: string): string {
	if (!siteUrl) return '';
	const data =
		page === 'home'
			? {
					'@context': 'https://schema.org',
					'@type': 'WebSite',
					name: NAME,
					url: at(siteUrl, '/'),
					description: PAGES.home.description,
					inLanguage: 'en',
					sameAs: PROFILES.map((p) => p.href)
				}
			: {
					'@context': 'https://schema.org',
					'@type': 'VideoGame',
					name: NAME,
					url: at(siteUrl, PAGES.walk.path),
					description: PAGES.walk.description,
					genre: 'Text adventure',
					gamePlatform: 'Web browser',
					playMode: 'SinglePlayer',
					isAccessibleForFree: true,
					inLanguage: 'en'
				};
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
