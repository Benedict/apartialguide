import { describe, expect, it } from 'vitest';
import type { AdventureWorld } from '../core/adventure/world';
import { exportPage } from './export';

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
	it('inlines the engine and the world', () => {
		expect(page()).toContain('var Adventure = function () {};');
		expect(page()).toContain('"title":"Long Street"');
	});

	it('cannot be broken out of by a map value that closes the script', () => {
		const hostile = { ...world, stops: { a: { ...world.stops.a, title: '</script><b>x</b>' } } };
		const html = page(hostile);
		expect(html).not.toContain('</script><b>');
		expect(html).toContain('\\u003c/script>');
	});

	it('is called A Partial Guide', () => {
		expect(page()).toContain('<title>A Partial Guide</title>');
	});

	it('credits the weather and Wikidata', () => {
		expect(page()).toContain('Open-Meteo.com');
		expect(page()).toContain('CC BY 4.0');
		expect(page()).toContain('Wikidata');
	});

	it('credits OpenStreetMap and dates the map', () => {
		expect(page()).toContain('OpenStreetMap contributors');
		expect(page()).toContain('24 October 2026');
	});

	it('begins with Guide introducing themselves', () => {
		expect(page()).toContain('game.begin().forEach(show)');
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
});
