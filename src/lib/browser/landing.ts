// Everything the microsite needs in the browser, bundled as one script: asking once whether the
// visit may be counted, and counting the way into the walk, only on a yes; and the mailing list's
// form, opened only when pressed.
import { loadConsent, saveConsent, startAnalytics, track } from './analytics';

export function landing(ga: string): void {
	openInPlace(document.querySelectorAll<HTMLAnchorElement>('a[data-frame]'), () =>
		document.createElement('iframe')
	);
	if (!ga) return;
	if (loadConsent() === 'granted') startAnalytics(ga);
	const strip = document.getElementById('consent');
	if (strip && !loadConsent()) strip.hidden = false;
	for (const button of strip?.querySelectorAll<HTMLButtonElement>('button') ?? [])
		button.addEventListener('click', () => {
			const consent = button.dataset.consent === 'granted' ? 'granted' : 'denied';
			saveConsent(consent);
			if (consent === 'granted') startAnalytics(ga);
			strip!.hidden = true;
		});
	for (const link of document.querySelectorAll<HTMLAnchorElement>('a.begin'))
		link.addEventListener('click', () => {
			if (loadConsent() === 'granted') track('begin_walk');
		});
}

type Framed = { setAttribute(name: string, value: string): void };

/**
 * A sign-up link whose form may open in the page: pressed, it gives way to the form, in a frame,
 * and only then is anything asked of the list's provider. Without the script it is a plain link.
 */
export function openInPlace(
	links: Iterable<Pick<HTMLAnchorElement, 'dataset' | 'addEventListener' | 'replaceWith'>>,
	make: () => Framed
): void {
	for (const link of links) {
		const src = link.dataset.frame;
		if (!src) continue;
		link.addEventListener('click', (e) => {
			e.preventDefault();
			const frame = make();
			frame.setAttribute('src', src);
			frame.setAttribute('title', 'Sign up');
			frame.setAttribute('class', 'signup-form');
			frame.setAttribute('loading', 'eager');
			link.replaceWith(frame as unknown as Node);
		});
	}
}
