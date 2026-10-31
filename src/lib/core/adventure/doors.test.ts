import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import { parse } from './parser';
import { entryFrom } from './entry';
import { tileWorld } from './tiles';
import type { AdventureWorld, CompiledStop } from './world';

// Invented areas, each a short street: no real place.
const stop = (title: string, lon: number, exits: CompiledStop['exits']): CompiledStop => ({
	title,
	paragraphs: [`You are standing on ${title}.`],
	exits,
	things: [],
	at: [51.38, lon]
});
const world: AdventureWorld = {
	start: 'a',
	asOf: '2026-10-29',
	doors: [
		{ name: 'Inventa', stop: 'a' },
		{ name: 'Outer Inventa', stop: 'c' },
		{ name: 'Elsewhere' }
	],
	stops: {
		a: stop('Long Street', 0, [{ label: 'east', to: 'b' }]),
		b: stop('Short Row', 0.001, [{ label: 'west', to: 'a' }]),
		c: stop('Mill Lane', 0.01, [])
	}
};
const fresh = (signup?: string) => {
	const game = new Adventure({ ...world, ...(signup ? { signup } : {}) });
	game.begin();
	return game;
};

describe('starting in an area', () => {
	it('reads start in and start at', () => {
		expect(parse('start in Outer Inventa')).toEqual({ verb: 'start', where: 'outer inventa' });
		expect(parse('start at 1_2:n3')).toEqual({ verb: 'start', where: '1_2:n3', at: true });
	});

	it('begins a walk at the area’s door, instead of the tour', () => {
		const reply = fresh().respond('start in Outer Inventa');
		expect(reply.title).toBe('Mill Lane');
		expect(reply.lines[0]).toBe('We begin in Outer Inventa.');
	});

	it('begins afresh from the middle of another walk', () => {
		const game = fresh();
		game.respond('take the tour');
		game.respond('east');
		expect(game.respond('start in outer inventa').title).toBe('Mill Lane');
		expect(game.respond('score').lines[0]).toMatch(/^You have walked 0 metres in 0 moves\./);
	});

	it('names an area not open yet as the edge does, with somewhere to sign up', () => {
		const reply = fresh('https://example.org/signup').respond('start in Elsewhere');
		expect(reply.lines).toEqual(['I carry no map of Elsewhere yet.']);
		expect(reply.hint).toBe('Elsewhere is not open yet.');
		expect(reply.link).toEqual({
			href: 'https://example.org/signup',
			text: 'Hear when Elsewhere opens'
		});
	});

	it('offers the open areas for a name it does not know', () => {
		const reply = fresh().respond('start in Atlantis');
		expect(reply.lines).toEqual([
			'I know of nowhere by that name to begin. I can begin in Inventa or Outer Inventa.'
		]);
		expect(reply.actions?.map((a) => a.command)).toEqual([
			'start in Inventa',
			'start in Outer Inventa'
		]);
	});

	it('begins at a place given by its name, as a shared link gives it, and asks for it to be opened first', () => {
		const game = fresh();
		expect(game.needs('start at c')).toEqual(['c']);
		expect(game.respond('start at c').title).toBe('Mill Lane');
		expect(fresh().respond('start at nowhere').lines).toEqual(['That place is not on my map.']);
	});

	it('keeps the doors through the tiles, under the names the tiles give', () => {
		const { head } = tileWorld(world, 300);
		expect(head.doors?.map((d) => d.stop?.endsWith(':c') ?? 'closed')).toEqual([
			false,
			true,
			'closed'
		]);
	});
});

describe('entering from a link', () => {
	it('begins in an area by its slug, or at a place a shared link names', () => {
		const doors = world.doors!;
		expect(entryFrom('#outer-inventa', doors)).toBe('start in Outer Inventa');
		expect(entryFrom('#at=1_2:n3', doors)).toBe('start at 1_2:n3');
		expect(entryFrom('#elsewhere', doors)).toBe('start in Elsewhere');
	});

	it('leaves the page’s own views, and anything else, to the page', () => {
		const doors = world.doors!;
		for (const hash of ['', '#', '#about', '#settings', '#game', '#atlantis'])
			expect(entryFrom(hash, doors)).toBeUndefined();
	});
});

describe('starting anywhere', () => {
	const pooled: AdventureWorld = { ...world, anywhere: ['b', 'c'] };

	it('reads start anywhere, and its other words', () => {
		for (const words of ['start anywhere', 'anywhere', 'start somewhere', 'surprise me'])
			expect(parse(words)).toEqual({ verb: 'start', where: 'anywhere' });
	});

	it('begins by chance at one of the places the map holds as worth beginning at, opened first', () => {
		const game = new Adventure(pooled);
		game.chance = () => 0.99;
		game.begin();
		expect(game.needs('start anywhere')).toEqual(['c']);
		const reply = game.respond('start anywhere');
		expect(reply.title).toBe('Mill Lane');
		expect(reply.lines[0]).toBe('Somewhere, then.');
	});

	it('begins at the tour’s start where the map holds no such places', () => {
		const game = new Adventure(world);
		game.begin();
		expect(game.respond('start anywhere').title).toBe('Long Street');
	});
});

describe('starting at a place by its name', () => {
	const named: AdventureWorld = {
		...world,
		stops: {
			...world.stops,
			c: {
				...world.stops.c,
				things: [{ id: 'node/9', name: 'The Sextant', aliases: [], description: 'A pub.' }]
			}
		}
	};

	it('begins at the place where a named thing is found, as a way to it would', () => {
		const game = new Adventure(named);
		game.begin();
		expect(game.needs('start at the sextant')).toEqual(['c']);
		const reply = game.respond('start at the sextant');
		expect(reply.title).toBe('Mill Lane');
		expect(reply.lines[0]).toBe('We begin at “The Sextant”.');
	});

	it('asks for the street network first, where the page has not given it', () => {
		const tiled = new Adventure({ ...named, about: { streets: 2, places: 99, accounts: [] } });
		expect(tiled.needsRoutes('start at the sextant')).toBe(true);
		expect(tiled.needsRoutes('start in inventa')).toBe(false);
	});

	it('says plainly when no place by that name is on the map', () => {
		const game = new Adventure(named);
		game.begin();
		expect(game.respond('start at the tabard').lines).toEqual(['That place is not on my map.']);
	});
});
