import { FRESH, type HintKeeper, type HintMemory } from '../core/adventure/hints';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'a-partial-guide:hints';

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/** The hints' memory, kept in the reader's browser across walks; afresh where it keeps nothing. */
export function browserHints(store: Store | undefined = browserStore()): HintKeeper {
	return {
		load(): HintMemory {
			try {
				const kept = JSON.parse(store?.getItem(KEY) ?? 'null');
				return {
					used: Array.isArray(kept?.used) ? kept.used : [],
					given: Array.isArray(kept?.given) ? kept.given : [],
					off: kept?.off === true
				};
			} catch {
				return structuredClone(FRESH);
			}
		},
		save(memory: HintMemory): void {
			try {
				store?.setItem(KEY, JSON.stringify(memory));
			} catch {
				// A browser that keeps nothing starts the hints afresh next time.
			}
		}
	};
}
