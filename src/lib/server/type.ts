import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The type: Commit Mono (Eigil Nikolajsen, SIL Open Font License), regular and bold, Latin only, kept
 * in static/fonts with its licence. A page swaps it in once loaded, so the first words never wait.
 */
export const MONO = `'Commit Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace`;

const WEIGHTS = [400, 700];

/** The files the site serves from fonts/, the licence with them. */
export const FONT_FILES = [...WEIGHTS.map((w) => `commit-mono-${w}.woff2`), 'OFL.txt'];

const dir = join('static', 'fonts');

/**
 * The font faces, served from `root` + `fonts/`, or, without a root, carried in the page itself, for a
 * page that plays from a single file.
 */
export function fontFaces(root?: string): string {
	return WEIGHTS.map((weight) => {
		const file = `commit-mono-${weight}.woff2`;
		const src = root
			? `'${root}fonts/${file}'`
			: `data:font/woff2;base64,${readFileSync(join(dir, file)).toString('base64')}`;
		return `@font-face { font-family: 'Commit Mono'; font-weight: ${weight}; font-style: normal; font-display: swap; src: url(${src}) format('woff2'); }`;
	}).join('\n');
}
