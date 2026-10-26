/**
 * Opens the exported page on a wide screen with the network allowed, asks gps, and waits for the
 * map to be drawn. It depends on jsDelivr and OpenFreeMap answering, so CI runs it without failing
 * the build on it; its log says whether the map came.
 *   EXPORT_PATH=site/index.html npm run map-check
 */
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const path = resolve(process.env.EXPORT_PATH ?? 'build/export/addiscombe.html');
const browser = await chromium.launch();
let drawn: boolean;
try {
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
	page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
	await page.goto(`file://${path}`);
	await page.getByRole('button', { name: 'Take the tour' }).click({ timeout: 15_000 });
	await page.fill('#command', 'gps');
	await page.press('#command', 'Enter');
	drawn = await page
		.locator('.map.drawn')
		.waitFor({ state: 'visible', timeout: 20_000 })
		.then(() => true)
		.catch(() => false);
} finally {
	await browser.close();
}
console.log(drawn ? 'The map was drawn.' : 'The map was not drawn.');
process.exit(drawn ? 0 : 1);
