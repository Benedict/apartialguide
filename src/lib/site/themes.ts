/**
 * The page's colours: as it is, light on dark, and the phosphors of the terminals text adventures were
 * first played on. Every shade is measured, not guessed: the text clears WCAG AAA on its paper, the
 * quieter words AA, so a long walk stays readable in any of them.
 */
export interface Theme {
	key: string;
	label: string;
	paper: string;
	ink: string;
	bright: string;
	muted: string;
	rule: string;
}

export const THEMES: Theme[] = [
	{
		key: 'paper',
		label: 'Paper',
		paper: '#000000',
		ink: '#d4d4cc',
		bright: '#ffffff',
		muted: '#8e8e86',
		rule: '#3a3a36'
	},
	{
		key: 'green',
		label: 'Green',
		paper: '#010a04',
		ink: '#4fe07f',
		bright: '#b8ffcc',
		muted: '#3a9e5b',
		rule: '#1d4a2b'
	},
	{
		key: 'amber',
		label: 'Amber',
		paper: '#0a0600',
		ink: '#ffb000',
		bright: '#ffdc8f',
		muted: '#b88a1f',
		rule: '#4d3a10'
	},
	{
		key: 'red',
		label: 'Red',
		paper: '#0a0101',
		ink: '#ff6a5c',
		bright: '#ffbdb5',
		muted: '#d0584c',
		rule: '#5c2620'
	}
];

/** WCAG's contrast ratio between two colours given as #rrggbb. */
export function contrast(a: string, b: string): number {
	const luminance = (hex: string) => {
		const [r, g, b] = [1, 3, 5].map((i) => {
			const c = parseInt(hex.slice(i, i + 2), 16) / 255;
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** The colours after the first, as the page's variables under `data-theme` on the root. */
export function themeCss(): string {
	return THEMES.slice(1)
		.map(
			(t) =>
				`:root[data-theme="${t.key}"] { --paper: ${t.paper}; --ink: ${t.ink}; --bright: ${t.bright}; --muted: ${t.muted}; --rule: ${t.rule}; --accent: ${t.bright}; }`
		)
		.join('\n');
}

/** Where the reader's choice is kept in their browser. */
export const THEME_KEY = 'a-partial-guide:theme';

/**
 * A line run in the page's head, before anything is drawn, that puts on the reader's colours: a page
 * drawn first and coloured after would flash. A browser that keeps nothing keeps the page as it is.
 */
export const themeBoot = (): string =>
	`<script>try{var t=localStorage.getItem('${THEME_KEY}');if(t&&t!=='paper')document.documentElement.dataset.theme=t}catch(e){}</script>`;
