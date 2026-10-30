/**
 * Draws pictures for the site's social profiles into build/social/: a profile picture (the mark,
 * centred to survive a circle) and portrait posts at 1080×1350, in the site's own type and colours.
 * Every word Guide says in them is the walk's own, as it played; nothing is written for the post.
 *   npm run social
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { LOCKUP, MARK } from '../src/lib/site/brand';
import { SOURCES } from '../src/lib/site/sources';
import { THEMES } from '../src/lib/site/themes';

const out = 'build/social';
/** Sources that need a key the site has not been given yet, so the walk does not speak from them. */
const UNKEYED = new Set(['Energy Performance of Buildings Register', 'Geograph']);
mkdirSync(out, { recursive: true });
const font = (w: number) =>
	`@font-face{font-family:'Commit Mono';font-weight:${w};src:url(data:font/woff2;base64,${readFileSync(`static/fonts/commit-mono-${w}.woff2`).toString('base64')})}`;
const esc = (t: string) =>
	t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

const css = (t = THEMES[0]) => `${font(400)}${font(700)}
	*{box-sizing:border-box}
	body{margin:0;background:${t.paper};color:${t.ink};font-family:'Commit Mono',monospace;--ink:${t.ink};--bright:${t.bright}}
	.frame{width:1080px;height:1350px;display:flex;flex-direction:column;background:${t.paper}}
	.bar{display:flex;justify-content:space-between;background:${t.ink};color:${t.paper};font-weight:700;font-size:30px;padding:18px 48px;white-space:nowrap;overflow:hidden}
	.screen{flex:1;padding:44px 56px 0;font-size:37px;line-height:1.5;overflow:hidden}
	.screen p{margin:0 0 30px}
	.cmd{color:${t.bright}}
	.title{color:${t.bright};font-weight:700}
	.foot{display:flex;align-items:center;gap:22px;padding:30px 56px 44px;color:${t.muted};font-size:28px}
	.foot svg{width:64px;height:64px}
	.quiet{color:${t.muted}}`;

const foot = (t = THEMES[0]) =>
	`<div class="foot">${MARK.replace('<svg ', `<svg style="--x:0" `)
		.replace(/#d4d4cc/g, t.ink)
		.replace(/#fff\b/g, t.bright)}<span>apartialguide.com</span></div>`;

/** A screen of the walk: the status bar, then commands and what Guide said, as played. */
const screen = (
	place: string,
	moves: number,
	lines: [kind: 'cmd' | 'title' | 'say', text: string][]
) =>
	`<div class="frame"><div class="bar"><span>${esc(place)}</span><span>Moves: ${moves}</span></div><div class="screen">${lines
		.map(
			([k, t]) => `<p class="${k === 'say' ? '' : k}">${k === 'cmd' ? '&gt; ' : ''}${esc(t)}</p>`
		)
		.join('')}</div>${foot()}</div>`;

const pictures: [name: string, width: number, height: number, html: string, style?: string][] = [
	[
		'profile',
		1080,
		1080,
		`<div style="width:1080px;height:1080px;background:#000;display:flex;align-items:center;justify-content:center">${MARK.replace('<svg ', '<svg width="620" height="620" ')}</div>`
	],
	[
		'post-1-hello',
		1080,
		1350,
		`<div class="frame" style="justify-content:center;padding:0 90px"><div>${LOCKUP.replace('<svg ', '<svg width="900" ')}</div>
		<p style="color:#fff;font-size:64px;font-weight:700;line-height:1.15;margin:110px 0 40px">The world as a text adventure.</p>
		<p style="font-size:38px;line-height:1.5;margin:0">Type a direction and walk. Every street, building, name and date comes from open data.</p>
		<p class="quiet" style="font-size:34px;margin:80px 0 0">It starts with Addiscombe, in Croydon.<br>apartialguide.com</p></div>`
	],
	[
		'post-2-est-bank',
		1080,
		1350,
		screen('Sundridge Road…', 1, [
			['cmd', 'take the tour'],
			['title', 'Sundridge Road, Lower Addiscombe Road and Bingham Road'],
			['say', 'It is said that you are in Addiscombe East, a ward.'],
			[
				'say',
				'North of you, at 209-213, stands a retail building. It was a bank. Once it was “est Bank”. Or there was NatWest here until January 2021, and then there was not. One name or the other; I cannot tell you which the bank went by.'
			],
			[
				'say',
				'The bank is gone, the kebab is rated, and the number stays: 209-213 Lower Addiscombe Road.'
			]
		])
	],
	[
		'post-3-plaques',
		1080,
		1350,
		screen('Colworth Road', 6, [
			['cmd', 'south'],
			['title', 'Colworth Road'],
			[
				'say',
				"Right here, a plaque the map does not have. It reads: “D. H. Lawrence lived and wrote 'Sons & Lovers' here at number 16 1908-1911 Writer and artist”."
			],
			[
				'say',
				'A tree to the west, beside you, and then I lose count, and find my place a few steps north, at another plaque: “Betty Westgate MBE 1919-2000 A pioneer and campaigner for breast cancer support and education.”'
			],
			['say', 'A writer and a campaigner, a few steps apart on Colworth Road.']
		])
	],
	[
		'post-4-drift',
		1080,
		1350,
		screen('Inglis Road and…', 3, [
			['cmd', 'drift'],
			['say', 'You drift south-west.'],
			['cmd', 'drift'],
			['say', 'You drift south-west.'],
			[
				'say',
				'A few steps east is a bus stop called “Ashburton Road”, standing where Inglis Road is.'
			],
			[
				'say',
				'I count one, and then I am not sure whether the stop was one or the start of something more. I let it go and carry on.'
			]
		])
	],
	[
		'post-5-colours',
		1080,
		1350,
		`<div class="frame" style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">${THEMES.map(
			(
				t
			) => `<div style="background:${t.paper};color:${t.ink};padding:48px 44px;font-size:30px;line-height:1.5;border:2px solid #000">
				<p style="color:${t.bright};margin:0 0 26px">&gt; colour ${t.key}</p>
				<p style="margin:0 0 26px">${t.key === 'paper' ? 'The screen turns as it was.' : `The screen turns ${t.key}.`}</p>
				<p style="color:${t.bright};margin:0 0 26px">&gt; drift</p>
				<p style="margin:0 0 26px">You drift south-west.</p>
				<p style="color:${t.bright};font-weight:700;margin:0 0 26px">Lower Addiscombe Road and Ashburton Road</p>
				<p style="margin:0">To the north-east, a few steps away, is bicycle parking.</p></div>`
		).join('')}</div>`
	],
	[
		'post-6-sources',
		1080,
		1350,
		`<div class="frame"><div style="flex:1;padding:90px 80px 0"><p style="color:#fff;font-size:64px;font-weight:700;line-height:1.2;margin:0 0 50px">Nothing in it is made up.</p>
		<p style="font-size:38px;line-height:1.5;margin:0 0 44px">Guide says only what these keep, and where the data is broken, Guide is too.</p>
		<p style="font-size:33px;line-height:1.7;margin:0" class="quiet">${SOURCES.filter(
			(s) => !UNKEYED.has(s.name)
		)
			.map((s) => esc(s.name))
			.join(' · ')}</p></div>${foot()}</div>`
	]
];

const browser = await chromium.launch();
for (const [name, width, height, html] of pictures) {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.setContent(
		`<!doctype html><html><head><style>${css()}</style></head><body>${html}</body></html>`
	);
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width, height } });
	console.log(`${out}/${name}.png`);
}
await browser.close();
