import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import { Adventure } from './engine';
import { parse } from './parser';
import { MemorySaves } from './saves';
import { MemoryTrails } from './trails';
import type { AdventureWorld, CompiledStop } from './world';

// An invented street of four stops, 100 metres apart, running east: no real place.
const origin: [number, number] = [51.38, -0.07];
const at = (i: number) => destination(origin, 90, i * 100) as [number, number];
const stops: Record<string, CompiledStop> = {};
for (let i = 0; i < 4; i++)
	stops[`s${i}`] = {
		title: `Invented Row ${i}`,
		paragraphs: [`You are standing on Invented Row ${i}.`],
		exits: [
			...(i < 3 ? [{ label: 'east', to: `s${i + 1}`, street: 'Invented Row' }] : []),
			...(i > 0 ? [{ label: 'west', to: `s${i - 1}`, street: 'Invented Row' }] : [])
		],
		things: [],
		at: at(i)
	};
const world: AdventureWorld = { start: 's0', stops };

function walker(trails = new MemoryTrails()) {
	const game = new Adventure(world);
	game.trails = trails;
	game.begin();
	game.respond('take the tour');
	return game;
}

const lines = (svg: string | undefined) => [...(svg ?? '').matchAll(/<polyline/g)].length;

describe('draw my walk', () => {
	it('reads its words', () => {
		for (const words of ['draw my walk', 'draw', 'draw the walk', 'draw my route'])
			expect(parse(words)).toEqual({ verb: 'draw', all: false });
		for (const words of ['draw my walks', 'draw all my walks', 'draw every walk'])
			expect(parse(words)).toEqual({ verb: 'draw', all: true });
	});

	it('draws the reader’s own walk, plainly, and Guide says nothing of its form', () => {
		const game = walker();
		game.respond('east');
		game.respond('east');
		game.respond('west');
		const reply = game.respond('draw my walk');
		expect(reply.lines).toEqual([]);
		expect(lines(reply.drawing)).toBe(1);
		expect([...reply.drawing!.matchAll(/points="([^"]+)"/g)][0][1].split(' ')).toHaveLength(4);
	});

	it('says so, as the page, where nothing has been walked yet', () => {
		const reply = walker().respond('draw my walk');
		expect(reply.drawing).toBeUndefined();
		expect(reply.hint).toBe('Walk a little first: there is no line to draw yet.');
	});

	it('keeps each walk between visits, so all of them can be drawn together', () => {
		const trails = new MemoryTrails();
		const first = walker(trails);
		first.respond('east');
		const second = walker(trails);
		second.respond('east');
		second.respond('east');
		expect(lines(second.respond('draw my walk').drawing)).toBe(1);
		expect(lines(second.respond('draw all my walks').drawing)).toBe(2);
	});

	it('goes on with the same line when a saved walk is picked up', () => {
		const trails = new MemoryTrails();
		const saves = new MemorySaves();
		const game = walker(trails);
		game.saves = saves;
		game.respond('east');
		game.respond('save 1');
		const later = walker(trails);
		later.saves = saves;
		later.respond('restore 1');
		later.respond('east');
		const drawn = later.respond('draw my walk').drawing!;
		expect([...drawn.matchAll(/points="([^"]+)"/g)][0][1].split(' ')).toHaveLength(3);
		// One walk, picked up: one line, not the same walk twice.
		expect(lines(later.respond('draw all my walks').drawing)).toBe(1);
	});
});
