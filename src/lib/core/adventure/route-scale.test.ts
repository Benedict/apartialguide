import { describe, expect, it } from 'vitest';
import { distance, destination } from '../geo';
import { planRoute, type RouteIndex } from './route';

// An invented grid of streets, each corner nudged a little by a fixed sequence: no real place.
function grid(n: number): RouteIndex {
	const index: RouteIndex = { stops: {}, names: {}, said: {}, aliases: {} };
	let seed = 7;
	const nudge = () => ((seed = (seed * 48271) % 2147483647) / 2147483647) * 20;
	const id = (r: number, c: number) => `g${r}.${c}`;
	for (let r = 0; r < n; r++)
		for (let c = 0; c < n; c++) {
			const at = destination(destination([51.38, -0.07], 90, c * 100 + nudge()), 180, r * 100);
			const exits: [string, string, string?][] = [];
			if (c + 1 < n) exits.push(['east', id(r, c + 1), `Row ${r}`]);
			if (c > 0) exits.push(['west', id(r, c - 1), `Row ${r}`]);
			if (r + 1 < n) exits.push(['south', id(r + 1, c), `Column ${c}`]);
			if (r > 0) exits.push(['north', id(r - 1, c), `Column ${c}`]);
			index.stops[id(r, c)] = { at: at as [number, number], exits };
		}
	return index;
}

/** The planner as it was, scanning every place reached for the nearest: the reference. */
function plannedBefore(index: RouteIndex, from: string, goal: string) {
	const metres = new Map<string, number>([[from, 0]]);
	const came = new Map<string, string>();
	const done = new Set<string>();
	const step = (a: string, b: string) => distance(index.stops[a].at!, index.stops[b].at!);
	for (;;) {
		let here: string | undefined;
		for (const [id, m] of metres)
			if (!done.has(id) && (here === undefined || m < metres.get(here)!)) here = id;
		if (here === undefined) return undefined;
		if (here === goal) {
			const path = [here];
			while (came.has(path[0])) path.unshift(came.get(path[0])!);
			return { path, metres: metres.get(here)! };
		}
		done.add(here);
		for (const [, to] of index.stops[here].exits) {
			const m = metres.get(here)! + step(here, to);
			if (!done.has(to) && m < (metres.get(to) ?? Infinity)) {
				metres.set(to, m);
				came.set(to, here);
			}
		}
	}
}

describe('planning across a large map', () => {
	it('finds the same way as before, place for place', () => {
		const index = grid(25);
		let seed = 11;
		const pick = () => {
			seed = (seed * 48271) % 2147483647;
			return `g${seed % 25}.${Math.floor(seed / 25) % 25}`;
		};
		for (let i = 0; i < 40; i++) {
			const [from, to] = [pick(), pick()];
			if (from === to) continue;
			const plan = planRoute(index, from, new Map([[to, 'there']]));
			const before = plannedBefore(index, from, to)!;
			expect(plan.kind).toBe('way');
			if (plan.kind === 'way') {
				expect(plan.path).toEqual(before.path);
				expect(plan.metres).toBeCloseTo(before.metres, 6);
			}
		}
	});

	it('crosses a map of 40,000 places in well under a second', () => {
		const index = grid(200);
		const started = performance.now();
		const plan = planRoute(index, 'g0.0', new Map([['g199.199', 'the far corner']]));
		expect(plan.kind).toBe('way');
		expect(performance.now() - started).toBeLessThan(1000);
	});
});
