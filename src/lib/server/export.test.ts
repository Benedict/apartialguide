import { describe, expect, it } from 'vitest';
import type { AdventureWorld } from '../core/adventure/world';
import { gunzipSync } from 'node:zlib';
import { exportPage } from './export';
import { LIVE, SOURCES } from '../site/sources';

/** The world as the page carries it: gzip, base64, in a script element of its own. */
const worldIn = (html: string) =>
	JSON.parse(
		gunzipSync(
			Buffer.from(
				html.match(/<script type="application\/gzip" id="world">([^<]*)<\/script>/)![1],
				'base64'
			)
		).toString('utf8')
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
		expect(page()).not.toContain('"title":"Long Street"');
	});

	it('cannot be broken out of by a map value that closes the script', () => {
		const hostile = { ...world, stops: { a: { ...world.stops.a, title: '</script><b>x</b>' } } };
		const html = page(hostile);
		expect(html).not.toContain('</script>' + '<b>');
		expect(worldIn(html).stops.a.title).toBe('</script><b>x</b>');
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
			'Contains OS data © Crown copyright and database right'
		])
			expect(page()).toContain(credit);
	});

	it('credits OpenStreetMap and dates the map', () => {
		expect(page()).toContain('OpenStreetMap contributors');
		expect(page()).toContain('24 October 2026');
	});

	it('begins with Guide introducing themselves', () => {
		expect(page()).toContain('game.begin(now).forEach(show)');
	});

	it('asks after the sky and today’s weather before Guide begins, and begins without the weather if none comes', () => {
		expect(page()).toContain('skyNow(WORLD.weatherAt');
		expect(page()).toMatch(/\.then\(\(now\) => \{\s*game\.begin\(now\)/);
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
});
