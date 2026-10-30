/**
 * Draws the brand's pictures from src/lib/site/brand.ts, so they never drift from it: the
 * home-screen icon and the image shown where the site is shared, into static/. Run by hand when
 * the brand changes; the export copies them into the site.
 *   npm run brand
 */
import { chromium } from 'playwright';
import { ICON, LOCKUP } from '../src/lib/site/brand';

const pictures: [string, number, number, string][] = [
	[
		'static/apple-touch-icon.png',
		180,
		180,
		ICON.replace('<svg ', '<svg width="180" height="180" ')
	],
	[
		'static/og.png',
		1200,
		630,
		`<div style="width:1200px;height:630px;background:#000;display:flex;align-items:center;justify-content:center">${LOCKUP.replace('<svg ', '<svg width="880" ')}</div>`
	]
];

const browser = await chromium.launch();
for (const [path, width, height, html] of pictures) {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.setContent(`<body style="margin:0;background:#000">${html}</body>`);
	await page.screenshot({ path, clip: { x: 0, y: 0, width, height } });
	console.log(`${path}: ${width}×${height}`);
}
await browser.close();
