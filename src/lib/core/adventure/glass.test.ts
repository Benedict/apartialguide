import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import { Adventure } from './engine';
import { parse } from './parser';
import { MemorySaves } from './saves';
import type { AdventureWorld, CompiledStop } from './world';

// An invented ring of twelve stops, 250 metres from a centre, each joined to the next: no real place.
const centre: [number, number] = [51.38, -0.07];
const at = (i: number) => destination(centre, i * 30, 250) as [number, number];
const ring: Record<string, CompiledStop> = {};
for (let i = 0; i < 12; i++)
	ring[`s${i}`] = {
		title: `Ring Road ${i}`,
		paragraphs: [`You are standing on Ring Road ${i}.`],
		exits: [
			{ label: 'onward', to: `s${(i + 1) % 12}`, street: 'Ring Road' },
			{ label: 'backward', to: `s${(i + 11) % 12}`, street: 'Ring Road' }
		],
		things:
			i === 4 ? [{ id: 'node/4', name: 'The Sextant', aliases: [], description: 'A pub.' }] : [],
		...(i === 7 ? { fragments: ['est Bank'] } : {}),
		at: at(i)
	};
const world: AdventureWorld = { start: 's0', stops: ring };

function walker() {
	const game = new Adventure(world);
	// The glass set down so its centre lies due south of where you stand.
	game.chance = () => 0.5;
	game.begin();
	game.respond('take the tour');
	return game;
}

describe('the glass', () => {
	it('reads its words', () => {
		for (const words of ['place a glass', 'glass', 'walk a circle', 'draw a circle'])
			expect(parse(words)).toEqual({ verb: 'glass', on: true });
		expect(parse('glass off')).toEqual({ verb: 'glass', on: false });
	});

	it('sets a circle down with its edge where you stand, and says the way round', () => {
		const reply = walker().respond('place a glass');
		expect(reply.lines).toEqual([
			'A circle, about 500 metres across. Its edge runs through where you stand.',
			'Your way round: onward (Ring Road).'
		]);
	});

	it('says the way round at each stop, and on closing the circle gives its record', () => {
		const game = walker();
		game.respond('place a glass');
		const turn = game.respond('go onward');
		expect(turn.lines.at(-1)).toBe('Your way round: onward (Ring Road). 1 of 12.');
		let last = turn;
		for (let i = 1; i < 12; i++) last = game.respond('go onward');
		expect(last.lines).toContain('The circle is closed.');
		const record = last.lines.slice(last.lines.indexOf('The circle is closed.') + 1);
		expect(record[0]).toBe('The record:');
		expect(record).toContain('Ring Road 4: The Sextant.');
		expect(record).toContain('Ring Road 7: “est Bank”.');
		expect(record.at(-1)).toMatch(/^You kept within \d+ metres? of the curve\.$/);
		expect(game.respond('go onward').lines.join(' ')).not.toMatch(/way round/);
	});

	it('lets the circle go when asked', () => {
		const game = walker();
		game.respond('place a glass');
		expect(game.respond('glass off').lines).toEqual(['I lift the glass.']);
		expect(game.respond('go onward').lines.join(' ')).not.toMatch(/way round/);
	});

	it('passes over a point the streets reach only far round, rather than walking out to it', () => {
		// The third point's stop hangs off a spur 2 km long; the fourth is reached straight from the second.
		const spur: AdventureWorld = {
			start: 's0',
			stops: {
				...ring,
				s1: {
					...ring.s1,
					exits: [
						{ label: 'onward', to: 's3', street: 'Ring Road' },
						{ label: 'spur', to: 'far', street: 'Spur Lane' },
						{ label: 'backward', to: 's0', street: 'Ring Road' }
					]
				},
				s2: { ...ring.s2, exits: [{ label: 'spur', to: 'far', street: 'Spur Lane' }] },
				s3: {
					...ring.s3,
					exits: [
						{ label: 'onward', to: 's4', street: 'Ring Road' },
						{ label: 'backward', to: 's1', street: 'Ring Road' }
					]
				},
				far: {
					...ring.s2,
					title: 'Far End',
					at: destination(centre, 60, 1250) as [number, number],
					exits: [
						{ label: 'spur', to: 's1', street: 'Spur Lane' },
						{ label: 'on', to: 's2', street: 'Spur Lane' }
					]
				}
			}
		};
		const game = new Adventure(spur);
		game.chance = () => 0.5;
		game.begin();
		game.respond('take the tour');
		game.respond('place a glass');
		expect(game.respond('go onward').lines.at(-1)).toBe(
			'Your way round: onward (Ring Road). 2 of 12.'
		);
	});

	it('sets the glass where the streets go round best, whichever way chance first turns it', () => {
		const game = new Adventure(world);
		// Chance turns it towards the north-east, where no street goes round; the ring lies south.
		game.chance = () => 0.1;
		game.begin();
		game.respond('take the tour');
		game.respond('place a glass');
		let last = game.respond('go onward');
		for (let i = 1; i < 12 && !last.lines.includes('The circle is closed.'); i++)
			last = game.respond('go onward');
		expect(last.lines).toContain('The circle is closed.');
		expect(game.respond('score').lines[0]).toMatch(/in 12 moves/);
	});

	it('is kept with the walk: a walk picked up again goes on round the same circle, its record kept', () => {
		const saves = new MemorySaves();
		const game = new Adventure(world);
		game.saves = saves;
		game.chance = () => 0.5;
		game.begin();
		game.respond('take the tour');
		game.respond('place a glass');
		for (let i = 0; i < 5; i++) game.respond('go onward');
		const later = new Adventure(world);
		later.saves = saves;
		later.chance = () => 0.5;
		later.begin();
		later.respond('restore auto');
		expect(later.respond('go onward').lines.at(-1)).toBe(
			'Your way round: onward (Ring Road). 6 of 12.'
		);
		let last = later.respond('go onward');
		for (let i = 7; i < 12; i++) last = later.respond('go onward');
		expect(last.lines).toContain('The circle is closed.');
		expect(last.lines).toContain('Ring Road 4: The Sextant.');
	});

	it('is lifted from a walk picked up on a map that has lost a point of it', () => {
		const saves = new MemorySaves();
		const game = new Adventure(world);
		game.saves = saves;
		game.chance = () => 0.5;
		game.begin();
		game.respond('take the tour');
		game.respond('place a glass');
		game.respond('go onward');
		const lesser = Object.fromEntries(Object.entries(ring).filter(([id]) => id !== 's9'));
		const later = new Adventure({ start: 's0', stops: lesser });
		later.saves = saves;
		later.begin();
		expect(later.respond('restore auto').title).toBe('Ring Road 1');
		expect(later.respond('go onward').lines.join(' ')).not.toContain('Your way round');
	});
});
