/**
 * Opens the exported page in a real browser, at phone size, and checks that it plays: Guide
 * introduces themselves, the tour can be taken with a click, the status line counts moves, gps
 * links to the map and asks for one on a wide screen, the About and Settings pages
 * open, and a setting turned off is kept and obeyed. Run after `npm run export`:
 *   EXPORT_PATH=build/export/addiscombe.html npm run smoke
 * or, for the site served in tiles, SITE_DIR=site npm run smoke, which serves it over http.
 * Outside requests are refused, as they may be anywhere, and the page must still play without them.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';

const site = process.env.SITE_DIR ? resolve(process.env.SITE_DIR) : undefined;
const path = site ?? resolve(process.env.EXPORT_PATH ?? 'build/export/addiscombe.html');
// The site is served, as Pages serves it; the single page is opened as a file.
const server = !site
	? undefined
	: createServer(async (req, res) => {
			const file = normalize(new URL(req.url ?? '/', 'http://x').pathname).replace(
				/\/$/,
				'/index.html'
			);
			try {
				const body = await readFile(join(site, file));
				res.writeHead(200, {
					'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/json'
				});
				res.end(body);
			} catch {
				res.writeHead(404).end();
			}
		}).listen(0);
const url = server
	? `http://localhost:${(server.address() as { port: number }).port}/`
	: `file://${path}`;
const browser = await chromium.launch();
const failures: string[] = [];
const check = (ok: boolean, what: string) => ok || failures.push(what);
/** Whether the element comes into view within a few seconds. */
const shows = (page: Page, selector: string) =>
	page
		.locator(selector)
		.waitFor({ state: 'visible', timeout: 5_000 })
		.then(() => true)
		.catch(() => false);
const says = (page: Page, words: string | RegExp) =>
	page.waitForFunction(
		([source, flags]) => new RegExp(source, flags).test(document.body.innerText),
		typeof words === 'string'
			? [words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), '']
			: [words.source, words.flags],
		{ timeout: 15_000 }
	);

try {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const asked: string[] = [];
	await context.route(
		(u) => u.protocol.startsWith('http') && u.hostname !== 'localhost',
		(route) => {
			asked.push(route.request().url());
			return route.abort();
		}
	);
	const page = await context.newPage();
	page.on('pageerror', (e) => failures.push(`page error: ${e.message}`));
	await page.goto(url);
	await says(page, 'I am Guide');
	check(
		asked.some((u) => u.includes('api.open-meteo.com/v1/forecast')),
		'the weather was not asked after'
	);
	const input = page.locator('#command');
	await page.getByRole('button', { name: 'Take the tour' }).click();
	await says(page, /Exits?:/);
	check(
		/Moves: \d+/.test(await page.locator('#status').innerText()),
		'the status line does not show the moves'
	);
	check(await input.isEnabled(), 'the prompt is not enabled');

	await input.fill('gps');
	await input.press('Enter');
	await says(page, 'By the map, you are at');
	const map = page.locator('#transcript a[href^="https://www.google.com/maps/"]').last();
	check((await map.count()) === 1, 'gps gives no link to Google Maps');

	// On a wide screen gps tries for a map; with nothing answering, the walk carries on without one.
	await page.setViewportSize({ width: 1200, height: 800 });
	await input.fill('gps');
	await input.press('Enter');
	await page.waitForTimeout(500);
	await input.fill('look');
	await input.press('Enter');
	await says(page, /Exits?:/);
	await page.setViewportSize({ width: 390, height: 844 });

	// gps on keeps a map beside the walk, though none can come here; gps off puts it away.
	await input.fill('gps on');
	await input.press('Enter');
	await says(page, 'I will keep the map beside you as we go.');
	await input.fill('look');
	await input.press('Enter');
	await says(page, /Exits?:/);
	await input.fill('gps off');
	await input.press('Enter');
	await says(page, 'I put the map away.');
	check(
		await page.locator('#follow').isHidden(),
		'the map kept by gps on is still there after gps off'
	);

	// The way somewhere: answering at all needs the street network, which the site fetches apart.
	await input.fill('route to nowhere the map has');
	await input.press('Enter');
	await says(page, 'I know of nowhere by that name on my map.');

	// The camera, with nothing answering, comes to nothing; the walk carries on.
	await input.fill('use the camera');
	await input.press('Enter');
	await says(page, 'Nothing happens.');

	// A walk saved in a slot, and kept as it goes, comes back after the page is closed.
	await input.fill('save 1');
	await input.press('Enter');
	await says(page, 'Saved in slot 1');
	const before = await page.locator('#status').innerText();
	await page.goto('about:blank');
	await page.goto(url);
	await page.getByRole('button', { name: /^Continue the walk/ }).click({ timeout: 15_000 });
	await says(page, 'We go on from where we were.');
	check(
		(await page.locator('#status').innerText()) === before,
		'the continued walk is not where it was'
	);
	await input.fill('restore');
	await input.press('Enter');
	await page.getByRole('button', { name: /^1: / }).click();
	await says(page, 'Restored from slot 1.');

	await page.click('a[href="#about"]');
	check(await shows(page, '#about'), 'the About page does not open');
	check(!(await page.locator('#game').isVisible()), 'the walk still shows behind About');
	await page.click('#about a[href="#"]');
	check(await shows(page, '#game'), 'the walk does not come back after About');
	check(
		(await page.locator('#transcript').innerText()).includes('Restored from slot 1.'),
		'the walk was lost on the way to About and back'
	);

	await page.click('a[href="#settings"]');
	check(await shows(page, '#settings'), 'the Settings page does not open');
	await page.uncheck('#settings input[name="weather"]');
	asked.length = 0;
	await page.goto('about:blank');
	await page.goto(url);
	await says(page, 'I am Guide');
	check(
		!asked.some((u) => u.includes('api.open-meteo.com/v1/forecast')),
		'the weather was asked after when off'
	);
	await page.goto(`${url}#settings`);
	await shows(page, '#settings');
	check(
		!(await page.locator('#settings input[name="weather"]').isChecked()),
		'the weather setting was not kept'
	);
} catch (err) {
	failures.push((err as Error).message.split('\n')[0]);
} finally {
	await browser.close();
	server?.close();
}
if (failures.length) {
	console.error(`The page at ${path} does not play:\n${failures.join('\n')}`);
	process.exit(1);
}
console.log(`The page at ${path} plays.`);
