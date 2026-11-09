import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import { Adventure } from './engine';
import { parse } from './parser';
import { MemorySaves } from './saves';
import type { AdventureWorld, CompiledStop } from './world';

// An invented lane running east beside an invented brook, buried for two places: no real river.
const origin: [number, number] = [51.38, -0.07];
const stops: Record<string, CompiledStop> = {};
for (let i = 0; i < 6; i++)
	stops[`s${i}`] = {
		title: `River Lane ${i}`,
		paragraphs: [`You are standing on River Lane ${i}.`],
		exits: [
			...(i < 5 ? [{ label: 'east', to: `s${i + 1}`, street: 'River Lane' }] : []),
			...(i > 0 ? [{ label: 'west', to: `s${i - 1}`, street: 'River Lane' }] : [])
		],
		things: [],
		at: destination(origin, 90, i * 100) as [number, number],
		...(i === 2 || i === 3 ? { beneath: [{ name: 'Inventa Brook', how: 'in a culvert' }] } : {})
	};
const world: AdventureWorld = {
	start: 's0',
	stops,
	rivers: [
		{
			name: 'Inventa Brook',
			points: [
				{ stop: 's1', hidden: false },
				{ stop: 's2', hidden: true },
				{ stop: 's3', hidden: true },
				{ stop: 's4', hidden: false }
			]
		}
	]
};

function walker() {
	const game = new Adventure(world);
	game.begin();
	game.respond('take the tour');
	return game;
}
const said = (game: Adventure, command: string) => game.respond(command).lines;

describe('following a river', () => {
	it('reads its words', () => {
		expect(parse('follow Inventa Brook')).toEqual({ verb: 'river', target: 'inventa brook' });
		expect(parse('follow the inventa brook')).toEqual({ verb: 'river', target: 'inventa brook' });
		expect(parse('walk the river')).toEqual({ verb: 'river', target: '' });
		expect(parse('river off')).toEqual({ verb: 'river', off: true });
		expect(parse('gps on')).toEqual({ verb: 'follow', on: true });
	});

	it('takes up a river by its name, and says the way to it', () => {
		expect(said(walker(), 'follow inventa brook')).toEqual([
			'“Inventa Brook”, as the map draws it: four places along it.',
			'Your way along “Inventa Brook”: east (River Lane).'
		]);
	});

	it('says at each place whether the river shows or runs hidden, and the way on', () => {
		const game = walker();
		game.respond('follow brook');
		expect(said(game, 'east')).toContain('“Inventa Brook” shows here.');
		const hidden = said(game, 'east');
		expect(hidden).toContain('“Inventa Brook” runs hidden here, in a culvert.');
		expect(hidden.join(' ')).not.toContain('Under your feet');
		expect(hidden).toContain('Your way along “Inventa Brook”: east (River Lane).');
	});

	it('ends where the map’s line ends, with the record of where it showed and hid', () => {
		const game = walker();
		game.respond('follow brook');
		for (let i = 0; i < 3; i++) game.respond('east');
		expect(said(game, 'east')).toEqual(
			expect.arrayContaining([
				'As far as the map draws “Inventa Brook”.',
				'Along your way it showed at two places, and ran hidden under two.'
			])
		);
		expect(said(game, 'west').join(' ')).not.toContain('Your way along');
	});

	it('names the rivers it has, when asked for one it has not', () => {
		expect(said(walker(), 'follow the fleet')).toEqual([
			'I know of no river by that name. The map has “Inventa Brook”.'
		]);
		expect(said(walker(), 'walk the river')).toEqual(['Which river? The map has “Inventa Brook”.']);
	});

	it('lets the river go, and keeps it in a saved walk', () => {
		const saves = new MemorySaves();
		const game = walker();
		game.saves = saves;
		game.respond('follow brook');
		game.respond('east');
		game.respond('save 1');
		const again = new Adventure(world);
		again.saves = saves;
		again.begin();
		again.respond('restore 1');
		expect(said(again, 'east')).toContain('“Inventa Brook” runs hidden here, in a culvert.');
		expect(said(again, 'river off')).toEqual(['I leave “Inventa Brook” to itself.']);
		expect(said(again, 'river off')).toEqual(['We are not following a river.']);
	});

	it('passes over a place on the far bank the streets reach only by a long way round', () => {
		// The brook's next place lies just across it, but the only way there is a kilometre round.
		const far: AdventureWorld = {
			...world,
			stops: {
				...stops,
				s1: {
					...stops.s1,
					exits: [...stops.s1.exits, { label: 'north', to: 'loop1', street: 'Long Way' }]
				},
				loop1: {
					title: 'Long Way',
					paragraphs: ['You are standing on Long Way.'],
					exits: [
						{ label: 'south', to: 's1', street: 'Long Way' },
						{ label: 'east', to: 'bank', street: 'Long Way' }
					],
					things: [],
					at: destination(origin, 45, 600) as [number, number]
				},
				bank: {
					title: 'Far Bank',
					paragraphs: ['You are standing on Far Bank.'],
					exits: [{ label: 'west', to: 'loop1', street: 'Long Way' }],
					things: [],
					at: destination(destination(origin, 90, 100), 0, 30) as [number, number]
				}
			},
			rivers: [
				{
					name: 'Inventa Brook',
					points: [
						{ stop: 's1', hidden: false },
						{ stop: 'bank', hidden: false },
						{ stop: 's2', hidden: true }
					]
				}
			]
		};
		const game = new Adventure(far);
		game.begin();
		game.respond('take the tour');
		game.respond('follow brook');
		expect(said(game, 'east')).toContain('Your way along “Inventa Brook”: east (River Lane).');
	});

	it('says plainly when the river never ran hidden, or never showed', () => {
		const open: AdventureWorld = {
			...world,
			rivers: [
				{
					name: 'Open Brook',
					points: [
						{ stop: 's1', hidden: false },
						{ stop: 's2', hidden: false }
					]
				}
			]
		};
		const game = new Adventure(open);
		game.begin();
		game.respond('take the tour');
		game.respond('follow open brook');
		game.respond('east');
		expect(said(game, 'east')).toContain(
			'Along your way it showed at two places, and never ran hidden.'
		);
		const buried: AdventureWorld = {
			...world,
			rivers: [
				{
					name: 'Buried Brook',
					points: [
						{ stop: 's2', hidden: true },
						{ stop: 's3', hidden: true }
					]
				}
			]
		};
		const under = new Adventure(buried);
		under.begin();
		under.respond('take the tour');
		under.respond('follow buried brook');
		under.respond('east');
		under.respond('east');
		expect(said(under, 'east')).toContain(
			'Along your way it never showed: it ran hidden under two places.'
		);
	});
});
