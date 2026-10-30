/**
 * What a page must have to be read by everyone, as The Website Specification puts it: one h1 first
 * and headings that never skip a level, a main landmark, and a skip link first in the body to it.
 * Used by the tests of every page.
 */
export function structureFaults(html: string): string[] {
	const faults: string[] = [];
	const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
	if (levels[0] !== 1) faults.push(`headings start at h${levels[0] ?? '(none)'}, not h1`);
	if (levels.filter((l) => l === 1).length !== 1) faults.push('not exactly one h1');
	levels.forEach((l, i) => {
		if (i && l > levels[i - 1] + 1) faults.push(`h${levels[i - 1]} is followed by h${l}`);
	});
	const main = html.match(/<main[^>]*\sid="([^"]+)"/);
	if (!main) faults.push('no main landmark with an id');
	const body = html.slice(html.indexOf('<body'));
	const skip = body.match(/<a class="skip" href="#([^"]+)">/);
	if (!skip || body.indexOf(skip[0]) > body.indexOf('<', body.indexOf('>') + 1))
		faults.push('no skip link first in the body');
	else if (!new RegExp(`id="${skip[1]}"`).test(html))
		faults.push(`the skip link's #${skip[1]} is not on the page`);
	return faults;
}
