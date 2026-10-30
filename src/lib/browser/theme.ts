import { isColour, type Colour } from '../core/adventure/colours';
import { THEME_KEY } from '../site/themes';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/** The colours the reader chose, kept in their browser; the page as it is, if none. */
export function loadTheme(store: Store | undefined = browserStore()): Colour {
	try {
		const kept = store?.getItem(THEME_KEY) ?? '';
		return isColour(kept) ? kept : 'paper';
	} catch {
		return 'paper';
	}
}

/** Keeps the reader's colours in their browser, if it will keep anything. */
export function saveTheme(colour: Colour, store: Store | undefined = browserStore()): void {
	try {
		store?.setItem(THEME_KEY, colour);
	} catch {
		// A browser that keeps nothing shows the page as it is next time.
	}
}

/** Puts the colours on the page (its root element): paper is the page as it is. */
export function applyTheme(
	colour: Colour,
	root: { dataset: DOMStringMap | Record<string, string | undefined> } = document.documentElement
): void {
	if (colour === 'paper') delete root.dataset.theme;
	else root.dataset.theme = colour;
}
