import type { LatLon } from '../geo';
/** A walk as it was saved: where, how far, and everything the walk remembers. */
export interface SavedWalk {
	version: 1;
	/** Which map the walk was on: a walk is never picked up on another. */
	map: string;
	savedAt: string;
	place: string;
	walked: number;
	moves: number;
	state: WalkState;
}

/** The engine's memory of a walk, as plain data. */
/** A circle being walked: its points, the next to reach, what was met, how far the walk strayed. */
export interface Circling {
	centre: LatLon;
	radius: number;
	points: string[];
	next: number;
	record: string[];
	seen: string[];
	strayed: number;
}

/** A river being followed: its course, the next place on it, and where it showed and hid. */
export interface Following {
	name: string;
	points: { stop: string; hidden: boolean }[];
	next: number;
	shown: number;
	hid: number;
	seen: string[];
}

export interface WalkState {
	here: string;
	previous?: string;
	moves: number;
	walked: number;
	verbose: boolean;
	/** Whether the map was kept beside the walk (gps on). */
	following?: boolean;
	/** The way the reader asked for: the name, and the stops it is found at. */
	route?: { to: string; goals: [string, string][] };
	/** The circle being walked (place a glass), if one is. */
	circle?: Circling;
	/** The river being followed, if one is. */
	river?: Following;

	lastCommand?: string;
	lastStreet?: string;
	visited: string[];
	explored: string[];
	pocket: string[];
	left: [string, string[]][];
	carried: [string, { at: string; move: number }][];
	recalled: string[];
	heard: string[][];
	framed: [string, string][];
	met: [string, { said: string; at: string; move: number; street?: boolean }[]][];
	connected: string[];
	/** Which walk this is, so its line is kept as one between visits. */
	id?: string;
	/** Where the map puts each stop come to, in order: the line `draw my walk` draws. */
	trail?: [number, number][];
}

/** Where walks are kept: the reader's browser, or memory in tests. */
export interface SaveStore {
	get(slot: string): SavedWalk | undefined;
	put(slot: string, walk: SavedWalk): void;
}

/** The numbered slots a reader may save in; the walk also keeps itself in `auto`. */
export const SLOTS = ['1', '2', '3', '4', '5'];
export const AUTO = 'auto';

/** Saves kept in memory, for tests and for a browser that keeps nothing. */
export class MemorySaves implements SaveStore {
	private readonly kept = new Map<string, string>();
	get(slot: string): SavedWalk | undefined {
		const json = this.kept.get(slot);
		return json ? (JSON.parse(json) as SavedWalk) : undefined;
	}
	put(slot: string, walk: SavedWalk): void {
		this.kept.set(slot, JSON.stringify(walk));
	}
}
