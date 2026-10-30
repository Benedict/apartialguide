/** The colours the page can take, the first as it is: their look lives with the page (site/themes.ts). */
export const COLOURS = ['paper', 'green', 'amber', 'red'] as const;

export type Colour = (typeof COLOURS)[number];

export const isColour = (word: string): word is Colour =>
	(COLOURS as readonly string[]).includes(word);
