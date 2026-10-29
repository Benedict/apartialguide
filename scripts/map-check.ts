/**
 * Opens the exported page on a wide screen with the network allowed, asks gps, and waits for the
 * map to be drawn; then uses the camera and looks up, and logs what came back. It depends on others'
 * servers answering, so CI runs it without failing the build on it; its log says what came.
 *   EXPORT_PATH=site/index.html npm run map-check
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const path = resolve(process.env.EXPORT_PATH ?? 'build/export/addiscombe.html');
// Served, not opened as a file: a file has no origin, and some servers answer such a page differently.
const server = createServer((_, res) => {
	res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
	res.end(readFileSync(path));
}).listen(0);
const port = (server.address() as { port: number }).port;
const browser = await chromium.launch();
let drawn: boolean;
try {
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
	page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
	page.on('response', (r) => {
		if (r.url().includes('jamcams'))
			console.log(`response: ${r.status()} ${r.url().slice(0, 120)}`);
	});
	page.on('requestfailed', (r) =>
		console.log(`request failed: ${r.url().slice(0, 120)} ${r.failure()?.errorText}`)
	);
	await page.goto(`http://localhost:${port}/`);
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
	// Until it loads, a picture shows its words; wait for the picture itself.
	await said('use the camera', () =>
		page.waitForFunction(
			() => (document.querySelector('img.picture') as HTMLImageElement | null)?.naturalWidth,
			undefined,
			{ timeout: 15_000 }
		)
	);
	const picture = await page
		.locator('img.picture')
		.last()
		.evaluate((img: HTMLImageElement) => img.naturalWidth)
		.catch(() => 0);
	console.log(picture ? `The camera's picture came, ${picture} px wide.` : 'No picture came.');
	if (!picture) {
		const src = await page
			.locator('img.picture')
			.last()
			.getAttribute('src')
			.catch(() => null);
		console.log(`picture: ${src ?? 'none shown'}`);
	}
	await said('look up', () => page.waitForTimeout(8_000));
} finally {
	await browser.close();
	server.close();
}
console.log(drawn ? 'The map was drawn.' : 'The map was not drawn.');
process.exit(drawn ? 0 : 1);
