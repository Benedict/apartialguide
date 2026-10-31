import { describe, expect, it, vi } from 'vitest';
import { tiledWorld, tileWorld, type Tile } from './tiles';
import type { AdventureWorld, CompiledStop } from './world';
import { destination } from '../geo';

// An invented street running east, and a lane a kilometre off: no real place.
const origin: [number, number] = [51.38, -0.07];
const at = (metres: number): [number, number] => {
	const [lat, lon] = destination(origin, 90, metres);
	return [+lat.toFixed(5), +lon.toFixed(5)];
};
const shop = { id: 'node/1', name: 'The Sextant', aliases: ['sextant'], description: 'A pub.' };
const stop = (title: string, metres: number, exits: CompiledStop['exits']): CompiledStop => ({
	title,
	paragraphs: [`You are standing on ${title}.`],
	exits,
	things: [shop],
	at: at(metres)
});
const world: AdventureWorld = {
	start: 'w1.0.1',
	asOf: '2026-01-01',
	about: { streets: 2, places: 3, accounts: [] },
	stops: {
		'w1.0.1': stop('Long Street', 0, [{ label: 'east', to: 'n2', street: 'Long Street' }]),
		n2: stop('Long Street and Short Row', 50, [
			{ label: 'west', to: 'w1.0.1' },
			{ label: 'east', to: 'n3' }
		]),
		n3: stop('Blind Lane', 1000, [{ label: 'west', to: 'n2' }])
	}
};

describe('tileWorld', () => {
	const { head, tiles } = tileWorld(world, 300);
	const all = Object.values(tiles).flatMap((t) => Object.keys(t.stops));

	it('puts every stop in one tile, and stops far apart in different tiles', () => {
		expect(all).toHaveLength(3);
		expect(Object.keys(tiles)).toHaveLength(2);
	});

	it('names each stop by its tile, so a link says where to find it', () => {
		for (const [key, tile] of Object.entries(tiles))
			for (const id of Object.keys(tile.stops)) expect(id.startsWith(`${key}:`)).toBe(true);
		expect(all).toContain(head.start);
	});

	it('names a stop the same in any map that holds it, so a saved walk finds its place again', () => {
		const name = (w: AdventureWorld, title: string) =>
			Object.values(tileWorld(w, 300).tiles)
				.flatMap((t) => Object.entries(t.stops))
				.find(([, s]) => s.title === title)![0];
		// A larger map, reaching further south-west, and a smaller one without the lane.
		const larger: AdventureWorld = {
			...world,
			stops: { ...world.stops, far: { ...world.stops.n3, title: 'Far Corner', at: at(-5000) } }
		};
		const smaller: AdventureWorld = {
			...world,
			stops: { 'w1.0.1': world.stops['w1.0.1'], n2: world.stops.n2 }
		};
		for (const title of ['Long Street', 'Long Street and Short Row'])
			expect(new Set([world, larger, smaller].map((w) => name(w, title))).size).toBe(1);
		expect(name(world, 'Long Street')).toMatch(/:w1\.0\.1$/);
	});

	it('carries the street network apart, under the names the tiles give', () => {
		const { routes } = tileWorld(world, 300);
		expect(Object.keys(routes.stops).sort()).toEqual([...all].sort());
		for (const s of Object.values(routes.stops))
			for (const [, to] of s.exits) expect(all).toContain(to);
	});

	it('carries the head apart: everything but the stops', () => {
		expect(head).not.toHaveProperty('stops');
		expect(head.about?.places).toBe(3);
		expect(head.asOf).toBe('2026-01-01');
	});
});

describe('tiledWorld', () => {
	const { head, tiles } = tileWorld(world, 300);
	const loader = () => {
		const fetchTile = vi.fn(async (key: string): Promise<Tile> => tiles[key]);
		return { fetchTile, ...tiledWorld(head, fetchTile) };
	};

	it('opens only the tiles asked for, once each', async () => {
		const { world: w, ensure, fetchTile } = loader();
		expect(Object.keys(w.stops)).toHaveLength(0);
		await ensure([head.start]);
		await ensure([head.start]);
		expect(fetchTile).toHaveBeenCalledTimes(1);
		expect(Object.keys(w.stops)).toHaveLength(2);
		expect(w.stops[head.start].title).toBe('Long Street');
	});

	it('follows the links: the exits lead to stops that can be opened', async () => {
		const { world: w, ensure } = loader();
		await ensure([head.start]);
		const east = w.stops[w.stops[head.start].exits[0].to];
		expect(east.title).toBe('Long Street and Short Row');
		await ensure(east.exits.map((e) => e.to));
		expect(w.stops[east.exits[1].to].title).toBe('Blind Lane');
		expect(w.stops[east.exits[1].to].things).toEqual([shop]);
	});

	it('asks nothing for what is not a tiled stop', async () => {
		const { ensure, fetchTile } = loader();
		await ensure(['nowhere', '']);
		expect(fetchTile).not.toHaveBeenCalled();
	});
});
