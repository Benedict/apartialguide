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

	it('credits OpenStreetMap and dates the map', () => {
		expect(page()).toContain('OpenStreetMap contributors');
		expect(page()).toContain('24 October 2026');
	});

	it('begins with Guide introducing themselves', () => {
		expect(page()).toContain('game.begin().forEach(show)');
	});

	it('asks the browser where the reader is, only when the reader says here', () => {
		expect(page()).toContain('reply.locate');
		expect(page()).toContain('navigator.geolocation.getCurrentPosition');
		expect(page()).toContain('game.notFound()');
	});

	it('has a prompt to type at', () => {
		expect(page()).toMatch(/<input[^>]+id="command"/);
	});
});
