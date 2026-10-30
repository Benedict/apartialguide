/**
 * Draws the brand's pictures from src/lib/site/brand.ts, so they never drift from it, into static/:
 * the home-screen icon, the app icons (one maskable, its mark inside the safe zone), the old-style
 * favicon.ico, and the image shown where the site is shared. Run by hand when the brand changes; the
 * export copies them into the site.
 *   npm run brand
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { ICON, LOCKUP, MARK } from '../src/lib/site/brand';

const sized = (svg: string, size: number) =>
	svg.replace('<svg ', `<svg width="${size}" height="${size}" `);

/** A maskable icon is cropped to a circle or squircle: the mark keeps to the middle 60%. */
const maskable = (size: number) =>
	`<div style="width:${size}px;height:${size}px;background:#000;display:flex;align-items:center;justify-content:center">${sized(MARK, Math.round(size * 0.6))}</div>`;

const pictures: [string, number, number, string][] = [
	['static/apple-touch-icon.png', 180, 180, sized(ICON, 180)],
	['static/icon-192.png', 192, 192, sized(ICON, 192)],
	['static/icon-512.png', 512, 512, sized(ICON, 512)],
	['static/icon-maskable-512.png', 512, 512, maskable(512)],
	[
		'static/og.png',
		1200,
		630,
		`<div style="width:1200px;height:630px;background:#000;display:flex;align-items:center;justify-content:center">${LOCKUP.replace('<svg ', '<svg width="880" ')}</div>`
	]
];

/** An ICO holding one PNG, as every browser since Vista reads. */
function ico(png: Buffer, size: number): Buffer {
	const header = Buffer.from([0, 0, 1, 0, 1, 0]);
	const entry = Buffer.alloc(16);
	entry.writeUInt8(size, 0);
	entry.writeUInt8(size, 1);
	entry.writeUInt16LE(1, 4);
	entry.writeUInt16LE(32, 6);
	entry.writeUInt32LE(png.length, 8);
	entry.writeUInt32LE(header.length + entry.length, 12);
	return Buffer.concat([header, entry, png]);
}

const browser = await chromium.launch();
const draw = async (html: string, width: number, height: number) => {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.setContent(`<body style="margin:0;background:#000">${html}</body>`);
	return page.screenshot({ clip: { x: 0, y: 0, width, height } });
};
for (const [path, width, height, html] of pictures) {
	writeFileSync(path, await draw(html, width, height));
	console.log(`${path}: ${width}×${height}`);
}
writeFileSync('static/favicon.ico', ico(await draw(sized(ICON, 32), 32, 32), 32));
console.log('static/favicon.ico: 32×32');
await browser.close();
