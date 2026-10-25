/**
 * Opens the exported page in a real browser and checks that it plays: Guide introduces themselves,
 * the tour can be taken, and the page throws nothing. Run after `npm run export`:
 *   EXPORT_PATH=site/index.html npm run smoke
 * Outside requests (weather, departures) are refused, as they may be anywhere, and the page must
 * still play without them.
 */
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const path = resolve(process.env.EXPORT_PATH ?? 'build/export/addiscombe.html');
const browser = await chromium.launch();
const failures: string[] = [];
try {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	page.on('pageerror', (e) => failures.push(`page error: ${e.message}`));
	await page.route(/^https?:/, (route) => route.abort());
	await page.goto(`file://${path}`);
	await page.waitForFunction(() => document.body.innerText.includes('I am Guide'), null, {
		timeout: 15_000
	});
	const input = page.locator('input').first();
	await input.fill('take the tour');
	await input.press('Enter');
	await page.waitForFunction(() => /Exits?:/.test(document.body.innerText), null, {
		timeout: 10_000
	});
	if (!(await input.isEnabled())) failures.push('the prompt is not enabled');
} catch (err) {
	failures.push((err as Error).message.split('\n')[0]);
} finally {
	await browser.close();
}
if (failures.length) {
	console.error(`The page at ${path} does not play:\n${failures.join('\n')}`);
	process.exit(1);
}
console.log(`The page at ${path} plays.`);
