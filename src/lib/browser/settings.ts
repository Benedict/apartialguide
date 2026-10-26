import type { LiveKey } from '../site/sources';

export type Settings = Record<LiveKey, boolean>;

const KEY = 'a-partial-guide:settings';
const ASK_ALL: Settings = { weather: true, departures: true, maps: true };

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
		return {
			weather: kept.weather !== false,
			departures: kept.departures !== false,
			maps: kept.maps !== false
		};
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
