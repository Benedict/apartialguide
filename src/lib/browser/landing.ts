// Everything the microsite needs in the browser, bundled as one script: asking once whether the
// visit may be counted, and counting the way into the walk, only on a yes.
import { loadConsent, saveConsent, startAnalytics, track } from './analytics';

export function landing(ga: string): void {
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
