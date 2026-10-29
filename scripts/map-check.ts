/**
 * Opens the exported page on a wide screen with the network allowed, asks gps, and waits for the
 * map to be drawn; then uses the camera and looks up, and logs what came back. It depends on others'
 * servers answering, so CI runs it without failing the build on it; its log says what came.
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
	const said = async (command: string, wait: () => Promise<unknown>) => {
		const before = await page.locator('#transcript section').count();
		await page.fill('#command', command);
		await page.press('#command', 'Enter');
		await wait().catch(() => undefined);
		const after = await page.locator('#transcript section').allInnerTexts();
		console.log(`> ${command}\n${after.slice(before).join('\n') || '(nothing)'}`);
	};
	await said('use the camera', () =>
		page.locator('img.picture').last().waitFor({ state: 'visible', timeout: 15_000 })
	);
	const picture = await page
		.locator('img.picture')
		.last()
		.evaluate((img: HTMLImageElement) => img.naturalWidth)
		.catch(() => 0);
	console.log(picture ? `The camera's picture came, ${picture} px wide.` : 'No picture came.');
	await said('look up', () => page.waitForTimeout(8_000));
} finally {
	await browser.close();
}
console.log(drawn ? 'The map was drawn.' : 'The map was not drawn.');
process.exit(drawn ? 0 : 1);
