import { distance } from '../geo';
import { distanceWords } from '../render/words';
import type { StopId } from '../stops';
import type { AdventureWorld } from './world';

/**
 * The street network alone, and where each name is to be found: enough to plan a way across the
 * whole map without opening every place on it. A site serves it apart, fetched when first asked for.
 */
export interface RouteIndex {
	stops: Record<
		StopId,
		{ at?: [number, number]; exits: [label: string, to: StopId, street?: string][] }
	>;
	/** Each name, lower-cased, and the stops it is found at: its streets and its named things. */
	names: Record<string, StopId[]>;
	/** Each name as found, by its lower-cased form. */
	said: Record<string, string>;
	/** Other words a reader might use for a named thing, its kind among them ("tram", "stop"). */
	aliases: Record<string, string[]>;
}

const SMALL = new Set(['a', 'an', 'the', 'some', 'any', 'nearest']);

/** A thing with a name of its own, not a kind ("bicycle parking"). */
const NAMED = /^[\p{Lu}\p{N}“"]/u;

export function routeIndex(world: Pick<AdventureWorld, 'stops'>): RouteIndex {
	const index: RouteIndex = { stops: {}, names: {}, said: {}, aliases: {} };
	const add = (name: string, id: StopId, aliases: readonly string[] = []) => {
		const key = name.toLowerCase();
		const more = aliases.filter((a) => !words(key).includes(a));
		if (more.length) index.aliases[key] = [...new Set([...(index.aliases[key] ?? []), ...more])];
		index.said[key] ??= name;
		const at = (index.names[key] ??= []);
		if (!at.includes(id)) at.push(id);
	};
	for (const [id, stop] of Object.entries(world.stops)) {
		index.stops[id] = {
			...(stop.at ? { at: stop.at } : {}),
			// No way is planned into an area not open to walk.
			exits: stop.exits
				.filter((e) => !e.closed)
				.map((e) => (e.street ? [e.label, e.to, e.street] : [e.label, e.to]))
		};
		for (const e of stop.exits) if (e.street && !e.closed) add(e.street, id);
		for (const t of stop.things)
			// No way is planned to a way into a mine.
			if (!t.background && !t.entry && NAMED.test(t.name)) add(t.name, id, t.aliases);
	}
	return index;
}

export interface Leg {
	label: string;
	street?: string;
	metres: number;
}

export type Plan =
	| { kind: 'unknown' }
	| { kind: 'here'; to: string }
	| { kind: 'unreachable'; to: string }
	| { kind: 'way'; to: string; path: StopId[]; legs: Leg[]; metres: number };

const words = (text: string) =>
	text
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

/** Where a name is, as the reader put it: the name itself, else every name holding all its words. */
export function goalsFor(index: RouteIndex, target: string): Map<StopId, string> {
	const key = target.toLowerCase().trim();
	// The small words of a question are not part of any name.
	const asked = words(key).filter((w) => !SMALL.has(w));
	const keys = index.names[key]
		? [key]
		: Object.keys(index.names).filter((k) => {
				const has = new Set([...words(k), ...(index.aliases[k] ?? [])]);
				return asked.length > 0 && asked.every((w) => has.has(w));
			});
	const goals = new Map<StopId, string>();
	for (const k of keys)
		for (const id of index.names[k]) if (!goals.has(id)) goals.set(id, index.said[k]);
	return goals;
}

/** A binary heap of places by metres, then by the order they were first reached. */
class Heap {
	private readonly items: [number, number, StopId][] = [];
	get size(): number {
		return this.items.length;
	}
	private less(i: number, j: number): boolean {
		const [a, b] = [this.items[i], this.items[j]];
		return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
	}
	private swap(i: number, j: number): void {
		[this.items[i], this.items[j]] = [this.items[j], this.items[i]];
	}
	push(metres: number, order: number, id: StopId): void {
		this.items.push([metres, order, id]);
		for (let i = this.items.length - 1; i > 0;) {
			const parent = (i - 1) >> 1;
			if (!this.less(i, parent)) break;
			this.swap(i, parent);
			i = parent;
		}
	}
	pop(): [number, number, StopId] | undefined {
		const top = this.items[0];
		const last = this.items.pop();
		if (!this.items.length || !last) return top;
		this.items[0] = last;
		for (let i = 0; ;) {
			const [l, r] = [2 * i + 1, 2 * i + 2];
			let least = i;
			if (l < this.items.length && this.less(l, least)) least = l;
			if (r < this.items.length && this.less(r, least)) least = r;
			if (least === i) break;
			this.swap(i, least);
			i = least;
		}
		return top;
	}
}

/** The shortest way along the streets from `from` to the nearest place of that name. */
export function planRoute(
	index: RouteIndex,
	from: StopId,
	target: string | Map<StopId, string>
): Plan {
	const goals = typeof target === 'string' ? goalsFor(index, target) : target;
	if (!goals.size) return { kind: 'unknown' };
	if (goals.has(from)) return { kind: 'here', to: goals.get(from)! };
	const metres = new Map<StopId, number>([[from, 0]]);
	const came = new Map<StopId, StopId>();
	const done = new Set<StopId>();
	const step = (a: StopId, b: StopId) => {
		const [p, q] = [index.stops[a]?.at, index.stops[b]?.at];
		return p && q ? distance(p, q) : 0;
	};
	// The nearest place not yet done, taken from a heap. A tie goes to the place reached first, as
	// it did when every place reached was scanned in turn, so the way found is the same.
	const order = new Map<StopId, number>([[from, 0]]);
	const queue = new Heap();
	queue.push(0, 0, from);
	for (;;) {
		let here: StopId | undefined;
		while (queue.size) {
			const [m, , id] = queue.pop()!;
			if (!done.has(id) && m === metres.get(id)) {
				here = id;
				break;
			}
		}
		if (here === undefined) return { kind: 'unreachable', to: [...goals.values()][0] };
		if (goals.has(here)) {
			const path = [here];
			while (came.has(path[0])) path.unshift(came.get(path[0])!);
			return {
				kind: 'way',
				to: goals.get(here)!,
				path,
				legs: legsOf(index, path, step),
				metres: metres.get(here)!
			};
		}
		done.add(here);
		for (const [, to] of index.stops[here]?.exits ?? []) {
			const m = metres.get(here)! + step(here, to);
			if (!done.has(to) && m < (metres.get(to) ?? Infinity)) {
				metres.set(to, m);
				came.set(to, here);
				if (!order.has(to)) order.set(to, order.size);
				queue.push(m, order.get(to)!, to);
			}
		}
	}
}

/** The path as legs, each along one street, named by the way it leaves its first stop. */
function legsOf(index: RouteIndex, path: StopId[], step: (a: StopId, b: StopId) => number): Leg[] {
	const legs: Leg[] = [];
	for (let i = 1; i < path.length; i++) {
		const [label, , street] = index.stops[path[i - 1]].exits.find(([, to]) => to === path[i])!;
		const last = legs.at(-1);
		if (last && street && last.street === street) last.metres += step(path[i - 1], path[i]);
		else legs.push({ label, ...(street ? { street } : {}), metres: step(path[i - 1], path[i]) });
	}
	return legs;
}

/** "To “The Sextant”: south along Short Row, 80 metres; then east along Long Street, 200 metres." */
export function routeWords(plan: Plan): string {
	if (plan.kind !== 'way') return '';
	const legs = plan.legs.map(
		(l) => `${l.label}${l.street ? ` along ${l.street}` : ''}, ${distanceWords(l.metres)}`
	);
	return `To “${plan.to}”: ${legs.join('; then ')}. About ${distanceWords(plan.metres)} in all.`;
}
