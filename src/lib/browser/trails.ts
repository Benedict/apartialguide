import type { Point } from '../core/adventure/drawing';
import type { TrailKeeper } from '../core/adventure/trails';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'a-partial-guide:trails';
/** How many walks are kept: the newest, so the browser's storage never fills. */
export const MOST_WALKS = 50;

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/** Every walk's line, kept in the reader's browser between visits; nothing where it keeps nothing. */
export function browserTrails(store: Store | undefined = browserStore()): TrailKeeper {
	const load = (): Map<string, Point[]> => {
		try {
			const kept = JSON.parse(store?.getItem(KEY) ?? '[]');
			return new Map(Array.isArray(kept) ? kept : []);
		} catch {
			return new Map();
		}
	};
	return {
		load,
		put(id, trail) {
			try {
				const kept = load();
				// The walk just walked goes last, so the oldest are the ones let go.
				kept.delete(id);
				kept.set(id, trail);
				store?.setItem(KEY, JSON.stringify([...kept].slice(-MOST_WALKS)));
			} catch {
				// A browser that keeps nothing keeps no line: the walk goes on.
			}
		}
	};
}
