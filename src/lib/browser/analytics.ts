/**
 * Google Analytics, only with the reader's consent: nothing loads, and nothing is counted, until
 * they say yes. Kept in their browser; asked again where it keeps nothing.
 */
export type Consent = 'granted' | 'denied';

const KEY = 'a-partial-guide:analytics';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/** The reader's answer, if they have given one. */
export function loadConsent(store: Store | undefined = browserStore()): Consent | undefined {
	try {
		const kept = store?.getItem(KEY);
		return kept === 'granted' || kept === 'denied' ? kept : undefined;
	} catch {
		return undefined;
	}
}

export function saveConsent(consent: Consent, store: Store | undefined = browserStore()): void {
	try {
		store?.setItem(KEY, consent);
	} catch {
		// A browser that keeps nothing asks again next time.
	}
}

interface Page {
	doc: {
		createElement(tag: 'script'): { src: string; async: boolean };
		head: { append(el: { src: string; async: boolean }): void };
	};
	win: { dataLayer?: unknown[] };
}

const thisPage = (): Page => ({
	doc: globalThis.document as unknown as Page['doc'],
	win: globalThis as unknown as Page['win']
});

/** Loads Google's tag for this measurement ID, once. Call only once the reader has said yes. */
export function startAnalytics(id: string, { doc, win }: Page = thisPage()): void {
	if (win.dataLayer) return;
	win.dataLayer = [];
	gtag(win, 'js', new Date());
	gtag(win, 'config', id);
	const script = doc.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
	doc.head.append(script);
}

/** Counts an event, if analytics were started; otherwise nothing. */
export function track(
	name: string,
	params: Record<string, string | number> = {},
	win: Page['win'] = thisPage().win
): void {
	if (win.dataLayer) gtag(win, 'event', name, params);
}

/** Google's tag reads its queue as arguments objects, as its own snippet pushes them. */
function asArguments(..._args: unknown[]): IArguments {
	// eslint-disable-next-line prefer-rest-params
	return arguments;
}

function gtag(win: Page['win'], ...args: unknown[]): void {
	win.dataLayer!.push(asArguments(...args));
}
