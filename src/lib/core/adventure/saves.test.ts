import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import { MemorySaves, type SavedWalk } from './saves';
import type { AdventureWorld, CompiledStop } from './world';
import { destination } from '../geo';

const west: [number, number] = [51.38, -0.07];
const stop = (title: string, at: [number, number], extra: Partial<CompiledStop>): CompiledStop => ({
	title,
	paragraphs: [`You are standing on ${title}.`, 'Exits: east, west.'],
	exits: [],
	things: [],
	at,
	...extra
});
const world: AdventureWorld = {
	start: 'a',
	asOf: '2026-10-24',
	stops: {
		a: stop('Long Street', west, {
			exits: [{ label: 'east', to: 'b' }],
			fragments: ['est Bank']
		}),
		b: stop('Blind Alley', destination(west, 90, 300) as [number, number], {
			exits: [{ label: 'west', to: 'a' }]
		})
	}
};
const clock = () => new Date('2026-10-26T09:30:00Z');

/** A walk begun with the given saves, taken east with a name in the pocket. */
function walked(saves = new MemorySaves()) {
	const game = new Adventure(world);
	game.saves = saves;
	game.clock = clock;
	game.chance = () => 0.99;
	game.begin();
	game.respond('take the tour');
	game.respond('take est bank');
	game.respond('east');
	return { game, saves };
}

describe('saving a walk', () => {
	it('saves into a numbered slot, and says what was saved', () => {
		const { game, saves } = walked();
		expect(game.respond('save 2').lines).toEqual([
			'Saved in slot 2: Blind Alley, 300 metres, 1 move.'
		]);
		expect(saves.get('2')?.place).toBe('Blind Alley');
	});

	it('asks which slot, offering each as a button with what it holds', () => {
		const { game } = walked();
		game.respond('save 2');
		const reply = game.respond('save');
		expect(reply.lines).toEqual(['Save in which slot?']);
		expect(reply.actions?.map((a) => [a.label, a.command])).toEqual([
			['1: empty', 'save 1'],
			['2: Blind Alley, 300 metres', 'save 2'],
			['3: empty', 'save 3'],
			['4: empty', 'save 4'],
			['5: empty', 'save 5']
		]);
	});

	it('keeps only five slots', () => {
		const { game } = walked();
		expect(game.respond('save 9').lines).toEqual(['There are slots 1 to 5.']);
	});

	it('says so when the browser keeps nothing', () => {
		const game = new Adventure(world);
		game.begin();
		game.respond('take the tour');
		expect(game.respond('save 1').lines).toEqual(['I have nowhere to keep a walk here.']);
	});
});

describe('restoring a walk', () => {
	it('picks the walk up where it was saved: place, distance, moves, pocket', () => {
		const { game, saves } = walked();
		game.respond('save 1');
		game.respond('west');
		game.respond('drop est bank');
		const reply = game.respond('restore 1');
		expect(reply.lines[0]).toBe('Restored from slot 1.');
		expect(reply.title).toBe('Blind Alley');
		expect(reply.lines).toContain('You are standing on Blind Alley.');
		expect(game.status()).toMatchObject({ place: 'Blind Alley', moves: 1 });
		expect(game.status().walked).toBeCloseTo(300, 0);
		expect(game.respond('i').lines).toEqual(['You are carrying “est Bank”.']);
		expect(saves.get('1')).toBeDefined();
	});

	it('restores into a new game too, from the same saves', () => {
		const { game, saves } = walked();
		game.respond('save 3');
		const later = new Adventure(world);
		later.saves = saves;
		later.begin();
		expect(later.respond('restore 3').title).toBe('Blind Alley');
		expect(later.respond('score').lines[0]).toMatch(/^You have walked 300 metres in 1 move\./);
	});

	it('lists the saved walks as buttons', () => {
		const { game } = walked();
		game.respond('save 1');
		const reply = game.respond('restore');
		expect(reply.lines).toEqual(['Restore which walk?']);
		expect(reply.actions?.map((a) => a.command)).toEqual(['restore auto', 'restore 1']);
	});

	it('says so when a slot is empty', () => {
		const { game } = walked();
		expect(game.respond('restore 4').lines).toEqual(['Slot 4 is empty.']);
	});

	it('picks up a walk saved on an earlier map, where the place it stood is still on this one', () => {
		const { game, saves } = walked();
		game.respond('save 1');
		const later = new Adventure({
			...world,
			asOf: '2027-01-01',
			stops: { ...world.stops, c: stop('New Row', west, { exits: [] }) }
		});
		later.saves = saves;
		later.begin();
		expect(later.respond('restore 1').title).toBe('Blind Alley');
		expect(later.respond('score').lines[0]).toMatch(/^You have walked 300 metres in 1 move\./);
	});

	it('says plainly when the place a walk stood is no longer on the map, and offers the tour', () => {
		const { game, saves } = walked();
		game.respond('save 1');
		const smaller = new Adventure({
			...world,
			asOf: '2027-01-01',
			stops: { a: { ...world.stops.a, exits: [] } }
		});
		smaller.saves = saves;
		smaller.begin();
		const reply = smaller.respond('restore 1');
		expect(reply.lines).toEqual([
			'The place that walk stood is no longer on my map. I cannot pick it up there.'
		]);
		expect(reply.actions?.map((a) => a.command)).toEqual(['take the tour']);
	});
});

describe('the walk kept as it goes', () => {
	it('saves itself after each command, in its own slot', () => {
		const { saves } = walked();
		const auto = saves.get('auto') as SavedWalk;
		expect(auto.place).toBe('Blind Alley');
		expect(auto.moves).toBe(1);
	});

	it('offers to continue a walk kept from before, beside the tour', () => {
		const { saves } = walked();
		const next = new Adventure(world);
		next.saves = saves;
		const [, offer] = next.begin();
		expect(offer.actions?.map((a) => a.label)).toEqual([
			'Continue the walk (Blind Alley, 300 metres)',
			'Take the tour'
		]);
		expect(next.respond('restore auto').title).toBe('Blind Alley');
	});

	it('offers to continue a walk not yet walked by its place alone, with no distance of nothing', () => {
		const saves = new MemorySaves();
		const first = new Adventure(world);
		first.saves = saves;
		first.begin();
		first.respond('take the tour');
		const next = new Adventure(world);
		next.saves = saves;
		const [, offer] = next.begin();
		expect(offer.actions?.[0].label).toMatch(/^Continue the walk \([^,]+\)$/);
	});

	it('offers to continue a walk kept on an earlier map, as the place may still be there', () => {
		const { saves } = walked();
		const next = new Adventure({ ...world, asOf: '2027-01-01' });
		next.saves = saves;
		const [, offer] = next.begin();
		expect(offer.actions?.map((a) => a.label)).toContain(
			'Continue the walk (Blind Alley, 300 metres)'
		);
	});
});
