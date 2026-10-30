import { createHash } from 'node:crypto';

/**
 * For the pages' tests: every script a page runs from its own text that its policy does not allow,
 * worked out afresh from the page as built, and whether it has a policy at all.
 */
export function unhashedScripts(html: string): string[] {
	const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
	if (!policy) return ['(no policy)'];
	return [...html.matchAll(/<script(\s[^>]*)?>([^]*?)<\/script>/g)]
		.filter(
			([, attrs = '']) => !/\ssrc=/.test(attrs) && !/type="application\/(ld\+)?json"/.test(attrs)
		)
		.map(([, , code]) => code)
		.filter(
			(code) =>
				!policy.includes(`'sha256-${createHash('sha256').update(code, 'utf8').digest('base64')}'`)
		)
		.map((code) => code.slice(0, 60));
}
