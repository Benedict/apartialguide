import { describe, expect, it } from 'vitest';
import type { AdventureWorld } from '../core/adventure/world';
import { gunzipSync } from 'node:zlib';
import { unpackWorld } from '../core/adventure/packed';
import { exportPage, wordsAmiss } from './export';
import { LIVE, SOURCES } from '../site/sources';

/** The world as the page carries it: gzip, base64, in a script element of its own. */
const worldIn = (html: string) =>
	unpackWorld(
		JSON.parse(
			gunzipSync(
				Buffer.from(
					html.match(/<script type="application\/gzip" id="world">([^<]*)<\/script>/)![1],
					'base64'
				)
			).toString('utf8')
		)
	);

const world: AdventureWorld = {
	start: 'a',
	stops: {
		a: {
			title: 'Long Street',
			paragraphs: ['You are standing on Long Street.'],
			exits: [],
			things: []
		}
	}
};

const page = (w: AdventureWorld = world) =>
	exportPage({ engine: 'var Adventure = function () {};', world: w, snapshotDate: '2026-10-24' });

describe('exportPage', () => {
	it('inlines the engine, and the world compressed', () => {
		expect(page()).toContain('var Adventure = function () {};');
		expect(worldIn(page())).toEqual(world);
		expect(page()).toContain('unpackWorld(');
		expect(page()).not.toContain('"title":"Long Street"');
	});

	it('cannot be broken out of by a map value that closes the script', () => {
		const hostile = { ...world, stops: { a: { ...world.stops.a, title: '</script><b>x</b>' } } };
		const html = page(hostile);
		expect(html).not.toContain('</script>' + '<b>');
		expect(worldIn(html).stops.a.title).toBe('</script><b>x</b>');
	});

	it('lets Guide speak before the map is opened, from a head the page carries apart', () => {
		const html = page({
			...world,
			asOf: '2026-10-24',
			about: { streets: 1, places: 1, accounts: ['</script><b>x</b>'] }
		});
		const head = JSON.parse(
			html.match(/<script type="application\/json" id="head">([^<]*)<\/script>/)![1]
		);
		expect(head.about.accounts).toEqual(['</script><b>x</b>']);
		expect(head.asOf).toBe('2026-10-24');
		const script = html.slice(html.indexOf('(async () =>'));
		expect(script.indexOf('introduction(HEAD)')).toBeGreaterThan(-1);
		expect(script.indexOf('show(introduction(HEAD))')).toBeLessThan(
			script.indexOf('await openWorld()')
		);
		// The map comes after the script, so the page can be read up to Guide's first words without it.
		expect(html.indexOf('id="world"')).toBeGreaterThan(html.indexOf('show(introduction(HEAD))'));
	});

	it('serves a tiled world without carrying it: the head inline, the tiles fetched as the walk reaches them', () => {
		const html = exportPage({
			engine: '',
			world: { ...world, start: '0-0:0', stops: {} },
			snapshotDate: '2026-10-24',
			tiles: 'tiles/'
		});
		expect(html).not.toContain('id="world"');
		const head = JSON.parse(
			html.match(/<script type="application\/json" id="head">([^<]*)<\/script>/)![1]
		);
		expect(head.start).toBe('0-0:0');
		expect(html).toContain('const TILES = "tiles/"');
		expect(html).toContain('tiledWorld(HEAD');
		expect(html).toContain('await ensure(game.needs(text))');
		// The street network, for planning a way, is fetched the first time a way is asked for.
		expect(html).toContain('if (game.needsRoutes(text)) await loadRoutes();');
		expect(html).toContain("fetch('routes.json')");
	});

	it('keeps one map under the status bar while gps is on, moved at each stop, and puts it away with gps off', () => {
		const html = page();
		expect(html).toMatch(
			/<div class="status" id="status">[^]*?<\/div>\s*<div class="follow" id="follow" hidden><\/div>/
		);
		expect(html).toContain('if (reply.follow === false) unfollow();');
		expect(html).toContain('reply.follow ? follow(reply.map) : drawMap(section, reply.map)');
		expect(html).toContain('followed.map.easeTo({ center: [place.longitude, place.latitude] })');
	});

	it('says what the walk is in plain words, with no label for it', () => {
		expect(page()).toContain('nothing in it is made up');
		expect(page()).not.toContain('art piece');
	});

	it('shows a hint apart from what Guide says, quieter', () => {
		const html = page();
		expect(html).toContain("if (reply.hint) section.append(el('p', reply.hint, 'hint'));");
		expect(html).toMatch(/\.hint \{[^}]*color: var\(--muted\)/);
	});

	it('asks nothing of Google without a measurement ID', () => {
		const html = page();
		expect(html).not.toContain('googletagmanager');
		expect(html).not.toContain('id="consent"');
		expect(html).toContain('Nothing you do on the walk is sent anywhere');
	});

	it('counts a visit with Google Analytics only once the reader says yes, and never what they type', () => {
		const html = exportPage({
			engine: '',
			world,
			snapshotDate: '2026-10-24',
			gaId: 'G-TEST123'
		});
		expect(html).toContain('const GA = "G-TEST123"');
		expect(html).toMatch(
			/<div class="consent" id="consent" hidden>[^]*?<button[^>]*>Yes<\/button>[^]*?<button[^>]*>No<\/button>/
		);
		// Loaded only on a yes: given before, or given now.
		expect(html).toContain("if (GA && loadConsent() === 'granted') startAnalytics(GA);");
		// The kind of command, never its words.
		expect(html).toContain("count('command', { verb: parse(text).verb });");
		expect(html).toContain('<input type="checkbox" name="analytics">');
		expect(html).toContain('never what you type');
		expect(html).not.toContain('Nothing you do on the walk is sent anywhere');
	});

	it('opens the world in the browser with its own decompression', () => {
		expect(page()).toContain("new DecompressionStream('gzip')");
	});

	it('is called A Partial Guide', () => {
		expect(page()).toContain('<title>A Partial Guide</title>');
	});

	it('credits the weather and Wikidata', () => {
		expect(page()).toContain('Open-Meteo');
		expect(page()).toContain('CC BY 4.0');
		expect(page()).toContain('Wikidata');
	});

	it('credits the other sources, as the Open Government Licence asks', () => {
		for (const credit of [
			'Food Standards Agency',
			'HM Land Registry data © Crown copyright and database right',
			'police.uk',
			'planning.data.gov.uk',
			'London Planning Datahub',
			'Open Plaques',
			'Open Government Licence v3.0',
			'Office for National Statistics',
			'London Datastore',
			'Contains OS data © Crown copyright and database right'
		])
			expect(page()).toContain(credit);
	});

	it('credits OpenStreetMap and dates the map', () => {
		expect(page()).toContain('OpenStreetMap contributors');
		expect(page()).toContain('24 October 2026');
	});

	it('begins with Guide introducing themselves', () => {
		expect(page()).toContain('show(introduction(HEAD))');
		expect(page()).toContain('game.offer(await today).forEach(show)');
	});

	it('asks after the sky and today’s weather while the world opens, and offers the tour without the weather if none comes', () => {
		expect(page()).toContain('const today = skyNow(HEAD.weatherAt');
		expect(page()).toContain('game.offer(await today)');
	});

	it('asks TfL what is due at the stops of each place shown', () => {
		expect(page()).toContain('game.transitHere()');
		expect(page()).toContain('fetchArrivals(');
		expect(page()).toContain('Powered by TfL Open Data');
	});

	it('has no header above the introduction', () => {
		expect(page()).not.toContain('class="note"');
	});

	it('never asks the browser where the reader is', () => {
		expect(page()).not.toContain('geolocation');
	});

	it('has a prompt to type at', () => {
		expect(page()).toMatch(/<input[^>]+id="command"/);
	});

	it('keeps the prompt above an on-screen keyboard', () => {
		expect(page()).toContain('interactive-widget=resizes-content');
		expect(page()).toContain('visualViewport');
	});

	it('has an About page crediting every source, and who made it', () => {
		expect(page()).toContain('id="about"');
		for (const source of SOURCES) {
			expect(page()).toContain(source.href);
			expect(page()).toContain(source.name);
		}
		expect(page()).toContain('Benedict');
	});

	it('has a Settings page with a choice for each source asked from the browser', () => {
		expect(page()).toContain('id="settings"');
		for (const live of LIVE) expect(page()).toContain(`name="${live.key}"`);
	});

	it('shows the link a reply carries, such as a place on a map', () => {
		expect(page()).toContain('reply.link');
	});

	it('offers a reply’s actions as buttons', () => {
		expect(page()).toContain('reply.actions');
	});

	it('asks after what a reply wants asked, and shows the picture a reply carries', () => {
		expect(page()).toContain('reply.ask');
		expect(page()).toContain('fetchCamera(');
		expect(page()).toContain('fetchSatellites(');
		expect(page()).toContain('game.overhead(');
		expect(page()).toContain('reply.image');
	});

	it('asks the flights function it was built with, and none without one', () => {
		const withFlights = exportPage({
			engine: '',
			world,
			snapshotDate: '2026-10-24',
			flightsUrl: 'https://flights.example.org/'
		});
		expect(withFlights).toContain('const FLIGHTS = "https://flights.example.org/";');
		expect(page()).toContain('const FLIGHTS = "";');
	});

	it('keeps a status line: the place, the distance walked and the moves', () => {
		expect(page()).toContain('id="status"');
		expect(page()).toContain('game.status()');
	});

	it('looks like a classic adventure: one typeface, light on dark, the status bar always on top', () => {
		expect(page()).toMatch(/body \{[^}]*font-family: var\(--mono\)/);
		expect(page()).toContain('color-scheme: dark');
		expect(page()).toMatch(/<div class="status" id="status"><span>A Partial Guide<\/span>/);
		expect(page()).toContain("'Walked: ' + distanceWords(now.walked) + '  Moves: ' + now.moves");
		expect(page()).not.toContain('<header>');
		expect(page()).toMatch(/form \{[^}]*gap: 1ch/);
	});

	it('draws gps’s place on a map, on a wide screen, from pinned MapLibre and OpenFreeMap', () => {
		expect(page()).toMatch(/maplibre-gl@\d+\.\d+\.\d+\/dist\/maplibre-gl\.js/);
		expect(page()).toContain('https://tiles.openfreemap.org/styles/');
		expect(page()).toContain("matchMedia('(min-width:");
		expect(page()).toContain('settings.maps');
	});

	it('keeps saved walks in the reader’s browser', () => {
		expect(page()).toContain('game.saves = browserSaves()');
	});

	it('finds words the code let slip into the world: undefined, null, NaN', () => {
		expect(wordsAmiss(world)).toEqual([]);
		const slipped = {
			...world,
			stops: { a: { ...world.stops.a, paragraphs: ['There is “undefined”, by another account.'] } }
		};
		expect(wordsAmiss(slipped)).toEqual(['a: There is “undefined”, by another account.']);
	});
});
