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
	page.on('response', (r) => {
		if (r.url().includes('jamcams'))
			console.log(`response: ${r.status()} ${r.url().slice(0, 120)}`);
	});
	page.on('requestfailed', (r) =>
		console.log(`request failed: ${r.url().slice(0, 120)} ${r.failure()?.errorText}`)
	);
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
	if (!picture) {
		// Why not: what the browser was given for the picture, asked the way the page asks.
		const src = await page
			.locator('img.picture')
			.last()
			.getAttribute('src')
			.catch(() => null);
		console.log(`picture: ${src ?? 'none shown'}`);
		const file = src?.split('/').at(-1);
		const forms = file
			? [
					src!,
					`https://s3.eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/${file}`,
					`https://jamcams.tfl.gov.uk.s3.eu-west-1.amazonaws.com/${file}`,
					`https://jamcams.tfl.gov.uk/${file}`
				]
			: [];
		for (const form of forms)
			console.log(
				`${form}: ` +
					(await page.evaluate(
						(url) =>
							new Promise<string>((done) => {
								const img = new Image();
								img.onload = () => done(`image loads, ${img.naturalWidth} px`);
								img.onerror = () => done('image fails');
								img.src = url;
								setTimeout(() => done('image times out'), 10_000);
							}),
						form
					))
			);
		if (src)
			console.log(
				await page.evaluate(async (url) => {
					const said = [];
					for (const method of ['HEAD', 'GET'])
						try {
							const res = await fetch(url, { method });
							said.push(
								`${method} ${res.status} type=${res.headers.get('content-type')} modified=${res.headers.get('last-modified')}`
							);
						} catch (e) {
							said.push(`${method} failed: ${(e as Error).message}`);
						}
					return said.join('; ');
				}, src)
			);
	}
	await said('look up', () => page.waitForTimeout(8_000));
} finally {
	await browser.close();
}
console.log(drawn ? 'The map was drawn.' : 'The map was not drawn.');
process.exit(drawn ? 0 : 1);
