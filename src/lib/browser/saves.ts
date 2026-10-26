import type { SaveStore, SavedWalk } from '../core/adventure/saves';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'a-partial-guide:save:';

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/**
 * Saved walks, kept in the reader's browser, one key per slot. Nothing at all when the browser
 * will not keep anything, so the game says it has nowhere to keep a walk.
 */
export function browserSaves(store: Store | undefined = browserStore()): SaveStore | undefined {
	if (!store) return undefined;
	try {
		store.setItem(`${KEY}check`, '1');
	} catch {
		return undefined;
	}
	return {
		get(slot: string): SavedWalk | undefined {
			try {
				const json = store.getItem(KEY + slot);
				return json ? (JSON.parse(json) as SavedWalk) : undefined;
			} catch {
				return undefined;
			}
		},
		put(slot: string, walk: SavedWalk): void {
			store.setItem(KEY + slot, JSON.stringify(walk));
		}
	};
}
