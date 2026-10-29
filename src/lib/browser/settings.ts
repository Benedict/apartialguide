import type { LiveKey } from '../site/sources';

export type Settings = Record<LiveKey, boolean>;

const KEY = 'a-partial-guide:settings';
const KEYS: LiveKey[] = [
	'weather',
	'departures',
	'maps',
	'air',
	'cameras',
	'satellites',
	'flights'
];
const ASK_ALL = Object.fromEntries(KEYS.map((k) => [k, true])) as Settings;

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/** What the reader chose to have asked from their browser; everything, if they chose nothing. */
export function loadSettings(store: Store | undefined = browserStore()): Settings {
	try {
		const kept = JSON.parse(store?.getItem(KEY) ?? '{}');
		return Object.fromEntries(KEYS.map((k) => [k, kept[k] !== false])) as Settings;
	} catch {
		return { ...ASK_ALL };
	}
}

/** Keeps the reader's choice in their browser, if it will keep anything. */
export function saveSettings(settings: Settings, store: Store | undefined = browserStore()): void {
	try {
		store?.setItem(KEY, JSON.stringify(settings));
	} catch {
		// A browser that keeps nothing asks after everything next time.
	}
}
