import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import type { OsmData } from '../osm';
import { Adventure } from './engine';
import { postcodeOf, postcodesFrom } from './postcodes';
import type { AdventureWorld, CompiledStop } from './world';

// Invented: two stops, and addresses the map gives postcodes, one of them on a way. No real place.
const here: [number, number] = [51.38, -0.07];
const there = destination(here, 90, 400) as [number, number];
const stop = (title: string, at: [number, number]): CompiledStop => ({
	title,
	paragraphs: [`You are standing on ${title}.`],
	exits: [],
	things: [],
	at
});
const stops = { a: stop('Long Street', here), b: stop('Short Row', there) };
const data: OsmData = {
	elements: [
		{
			type: 'node',
			id: 1,
			lat: here[0],
			lon: here[1] + 0.0002,
			tags: { 'addr:postcode': 'ZZ1 1AA' }
		},
		{ type: 'node', id: 2, lat: there[0], lon: there[1] },
		{ type: 'node', id: 3, lat: there[0] + 0.0002, lon: there[1] },
		{ type: 'way', id: 4, nodes: [2, 3], tags: { 'addr:postcode': 'zz1 2bb' } },
		{ type: 'node', id: 5, lat: 48.85, lon: 2.35, tags: { 'addr:postcode': 'ZZ9 9ZZ' } }
	]
} as OsmData;

describe('postcodes the map carries', () => {
	it('reads a postcode however it is typed, and nothing that is not one', () => {
		expect(postcodeOf('cr07he')).toBe('CR0 7HE');
		expect(postcodeOf(' CR0  7HE ')).toBe('CR0 7HE');
		expect(postcodeOf('the alma tavern')).toBeUndefined();
	});

	it('gives each postcode the map carries the place nearest its addresses, near enough', () => {
		expect(postcodesFrom(data, stops)).toEqual({ 'ZZ1 1AA': 'a', 'ZZ1 2BB': 'b' });
	});

	it('begins a walk at a postcode’s place, from the page alone', () => {
		const world: AdventureWorld = { start: 'a', stops, postcodes: { 'ZZ1 2BB': 'b' } };
		const game = new Adventure(world);
		game.begin();
		expect(game.needsRoutes('start at zz1 2bb')).toBe(false);
		expect(game.needs('start at zz12bb')).toEqual(['b']);
		const reply = game.respond('start at zz1 2bb');
		expect(reply.title).toBe('Short Row');
		expect(reply.lines[0]).toBe('We begin at ZZ1 2BB.');
		expect(game.respond('start at zz9 9zz').lines).toEqual([
			'I have no place for ZZ9 9ZZ on my map.'
		]);
	});
});
