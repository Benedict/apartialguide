import type { Circling, Following, WalkState } from './saves';

/** A distinctive word met on a walk: in what name, where and when. */
export interface Meeting {
	said: string;
	at: string;
	move: number;
	street?: boolean;
}

/**
 * Everything a walk remembers, as the engine holds it while the walk goes on. It has exactly the
 * parts a kept walk has (`WalkState`): a part added here must be added there, and the compiler
 * then asks how it is kept and picked up (`KEEP`, `PICK_UP`), so no part is lost on saving.
 */
export interface Walk {
	here: string;
	/** Where the walk came from, for `back`. */
	previous?: string;
	moves: number;
	/** Metres walked, between where the map puts each stop. */
	walked: number;
	verbose: boolean;
	/** Whether the map is kept beside the walk (gps on). */
	following: boolean;
	/** The way the reader asked for: the name, and the stops it is found at. */
	route?: { to: string; goals: [string, string][] };
	/** The circle being walked (place a glass), if one is. */
	circle?: Circling;
	/** The river being followed, if one is. */
	river?: Following;
	lastCommand?: string;
	lastStreet?: string;
	visited: Set<string>;
	/** Stops where the reader has found what was hidden. */
	explored: Set<string>;
	/** The names the reader carries. */
	pocket: string[];
	/** Names the reader dropped, by the stop they lie at. */
	left: Map<string, string[]>;
	/** The broken names Guide carries, from where and when. */
	carried: Map<string, { at: string; move: number }>;
	/** Those Guide has brought back. */
	recalled: Set<string>;
	/** What the reader heard at the last places, as the template keys it. */
	heard: string[][];
	/** The last way each framing line was put. */
	framed: Map<string, string>;
	/** Distinctive words met on this walk. */
	met: Map<string, Meeting[]>;
	/** Words already set side by side. */
	connected: Set<string>;
	/** Which walk this is, so its line is kept as one between visits. */
	id?: string;
	/** Where the map puts each stop come to, in order. */
	trail: [number, number][];
}

/** Walk and WalkState have the same parts, or this does not compile. */
type SameParts<A, B> = [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] extends [never, never]
	? true
	: { missing: [Exclude<keyof A, keyof B>, Exclude<keyof B, keyof A>] };
const sameParts: SameParts<Walk, WalkState> = true;
void sameParts;

const copyCircle = (c: Circling): Circling => ({
	...c,
	points: [...c.points],
	record: [...c.record],
	seen: [...c.seen]
});
const copyRiver = (r: Following): Following => ({
	...r,
	points: r.points.map((p) => ({ ...p })),
	seen: [...r.seen]
});
const copyRoute = (r: { to: string; goals: [string, string][] }) => ({
	to: r.to,
	goals: r.goals.map(([id, name]) => [id, name] as [string, string])
});
const copyMeetings = (list: readonly Meeting[]) => list.map((m) => ({ ...m }));

/** How each part is kept: every part named, or this does not compile. */
const KEEP: { [K in keyof WalkState]-?: (w: Walk) => WalkState[K] } = {
	here: (w) => w.here,
	previous: (w) => w.previous,
	moves: (w) => w.moves,
	walked: (w) => w.walked,
	verbose: (w) => w.verbose,
	following: (w) => (w.following ? true : undefined),
	route: (w) => w.route && copyRoute(w.route),
	circle: (w) => w.circle && copyCircle(w.circle),
	river: (w) => w.river && copyRiver(w.river),
	lastCommand: (w) => w.lastCommand,
	lastStreet: (w) => w.lastStreet,
	visited: (w) => [...w.visited],
	explored: (w) => [...w.explored],
	pocket: (w) => [...w.pocket],
	left: (w) => [...w.left].map(([at, names]) => [at, [...names]]),
	carried: (w) => [...w.carried].map(([name, from]) => [name, { ...from }]),
	recalled: (w) => [...w.recalled],
	heard: (w) => w.heard.map((h) => [...h]),
	framed: (w) => [...w.framed],
	met: (w) => [...w.met].map(([word, list]) => [word, copyMeetings(list)]),
	connected: (w) => [...w.connected],
	id: (w) => w.id,
	trail: (w) => (w.trail.length ? w.trail.map((p) => [...p] as [number, number]) : undefined)
};

/** How each part is picked up again, a part an older walk lacks given as a fresh walk has it. */
const PICK_UP: { [K in keyof Walk]-?: (s: WalkState) => Walk[K] } = {
	here: (s) => s.here,
	previous: (s) => s.previous,
	moves: (s) => s.moves,
	walked: (s) => s.walked,
	verbose: (s) => s.verbose,
	following: (s) => s.following ?? false,
	route: (s) => s.route && copyRoute(s.route),
	circle: (s) => s.circle && copyCircle(s.circle),
	river: (s) => s.river && copyRiver(s.river),
	lastCommand: (s) => s.lastCommand,
	lastStreet: (s) => s.lastStreet,
	visited: (s) => new Set(s.visited),
	explored: (s) => new Set(s.explored),
	pocket: (s) => [...s.pocket],
	left: (s) => new Map(s.left.map(([at, names]) => [at, [...names]])),
	carried: (s) => new Map(s.carried.map(([name, from]) => [name, { ...from }])),
	recalled: (s) => new Set(s.recalled),
	heard: (s) => s.heard.map((h) => [...h]),
	framed: (s) => new Map(s.framed),
	met: (s) => new Map(s.met.map(([word, list]) => [word, copyMeetings(list)])),
	connected: (s) => new Set(s.connected),
	id: (s) => s.id,
	trail: (s) => (s.trail ?? []).map((p) => [...p] as [number, number])
};

/** The walk as plain data to keep, apart from the walk going on; a part with nothing in it left out. */
export function keepWalk(walk: Walk): WalkState {
	const state: Record<string, unknown> = {};
	for (const [part, keep] of Object.entries(KEEP)) {
		const value = (keep as (w: Walk) => unknown)(walk);
		if (value !== undefined) state[part] = value;
	}
	return state as unknown as WalkState;
}

/** A kept walk, picked up again, apart from what was kept. */
export function pickUpWalk(state: WalkState): Walk {
	const walk: Record<string, unknown> = {};
	for (const [part, pick] of Object.entries(PICK_UP))
		walk[part] = (pick as (s: WalkState) => unknown)(state);
	return walk as unknown as Walk;
}

/** A walk begun at a place, with nothing done yet. */
export function freshWalk(here: string): Walk {
	return pickUpWalk({
		here,
		moves: 0,
		walked: 0,
		verbose: false,
		visited: [],
		explored: [],
		pocket: [],
		left: [],
		carried: [],
		recalled: [],
		heard: [],
		framed: [],
		met: [],
		connected: []
	});
}
