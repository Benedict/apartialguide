/**
 * Draws the brand kit into brand/, from src/lib/site/brand.ts, so it never drifts from it: the mark
 * and the lockup in every colourway, as SVG and as PNG, on nothing and on their paper, and headers
 * for the site's profiles and its mailing list in each of the page's colours. Run by hand when the
 * brand changes.
 *   npm run brand:kit
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { COLOURWAYS, lockupIn, markIn, type Colourway } from '../src/lib/site/brand';
import { THEMES } from '../src/lib/site/themes';

const out = 'brand';
const font = (w: number) =>
	`@font-face{font-family:'Commit Mono';font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(`static/fonts/commit-mono-${w}.woff2`).toString('base64')})}`;
const sized = (svg: string, width: number) => svg.replace('<svg ', `<svg width="${width}" `);

/** The headers: where each is used, and its size, as each place asks. */
const HEADERS: [name: string, width: number, height: number][] = [
	['substack-header', 1500, 500],
	['substack-cover', 1200, 630],
	['linkedin-banner', 1584, 396],
	['linkedin-page-cover', 1128, 191],
	['x-header', 1500, 500],
	['bluesky-banner', 3000, 1000]
];

/**
 * A header: the lockup, and the site's own line beneath it, in the middle, where a profile picture
 * laid over a corner never reaches.
 */
function header(c: Colourway & { muted: string }, width: number, height: number): string {
	const lockup = Math.round(Math.min(width * 0.42, height * 1.5));
	const line = Math.max(14, Math.round(lockup / 30));
	const tall = height >= lockup * 0.6;
	return `<style>${font(400)}</style><div style="width:${width}px;height:${height}px;background:${c.paper};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(line * 1.2)}px;font-family:'Commit Mono',monospace">${sized(lockupIn(c), lockup)}${
		tall
			? `<div style="color:${c.muted};font-size:${line}px;letter-spacing:0.02em">The world as a text adventure, built from open data · apartialguide.com</div>`
			: ''
	}</div>`;
}

const browser = await chromium.launch();
const draw = async (path: string, html: string, width: number, height: number, clear = false) => {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.setContent(`<body style="margin:0;background:transparent">${html}</body>`);
	await page.evaluate(() => document.fonts.ready);
	writeFileSync(
		path,
		await page.screenshot({ clip: { x: 0, y: 0, width, height }, omitBackground: clear })
	);
	await page.close();
	console.log(`${path}: ${width}×${height}`);
};

for (const c of COLOURWAYS) {
	const dir = `${out}/logo/${c.key}`;
	mkdirSync(dir, { recursive: true });
	const files: [string, string][] = [
		['mark.svg', markIn(c)],
		['mark-on-paper.svg', markIn(c, true)],
		['lockup.svg', lockupIn(c)],
		['lockup-on-paper.svg', lockupIn(c, true)]
	];
	for (const [file, svg] of files) writeFileSync(`${dir}/${file}`, `${svg}\n`);
	await draw(`${dir}/mark-1024.png`, sized(markIn(c), 1024), 1024, 1024, true);
	await draw(`${dir}/mark-on-paper-1024.png`, sized(markIn(c, true), 1024), 1024, 1024);
	// The lockup's box is 304 by 112.
	await draw(
		`${dir}/lockup-2400.png`,
		sized(lockupIn(c), 2400),
		2400,
		Math.round((2400 * 112) / 304),
		true
	);
	await draw(
		`${dir}/lockup-on-paper-2400.png`,
		sized(lockupIn(c, true), 2400),
		2400,
		Math.round((2400 * 112) / 304)
	);
}

for (const t of THEMES) {
	const dir = `${out}/headers/${t.key}`;
	mkdirSync(dir, { recursive: true });
	for (const [name, width, height] of HEADERS)
		await draw(`${dir}/${name}-${width}x${height}.png`, header(t, width, height), width, height);
	// The mailing list's logo, square.
	await draw(`${dir}/substack-logo-1024.png`, sized(markIn(t, true), 1024), 1024, 1024);
}

// The mailing list's wordmark, on nothing: black for its usual white header, white for a dark one.
for (const key of ['black', 'white']) {
	const c = COLOURWAYS.find((w) => w.key === key)!;
	await draw(
		`${out}/headers/substack-wordmark-${key}-1200x300.png`,
		`<div style="width:1200px;height:300px;display:flex;align-items:center;justify-content:center">${sized(lockupIn(c), 760)}</div>`,
		1200,
		300,
		true
	);
}
await browser.close();
