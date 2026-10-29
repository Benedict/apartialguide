/** Below this the sun has gone and the sky is dark; between it and the horizon, dusk. */
const DARK = -6;

/**
 * A street's lighting said for the hour. The map says whether a street is lit; that it has lamps
 * along it follows. Whether they are on, the sun, worked out for now, decides: Guide's licence is
 * in the hour, never in a lamp's being there. Two ways of saying each, turned by `variant`.
 */
const SAID = {
	yes: {
		day: [
			'There are street lamps along here, unlit by day.',
			'Street lamps line the way; it is day, and they are out.'
		],
		dusk: ['The street lamps are coming on.', 'The street lamps come on, one and then another.'],
		dark: [
			'Street lamps light the way.',
			'The street lamps are lit, and the dark sits between them.'
		]
	},
	no: {
		day: ['There are no street lamps here.', 'No street lamps along here.'],
		dusk: [
			'No street lamps, and the light is going.',
			'The light is going, and there are no lamps to take its place.'
		],
		dark: ['No street lamps; it is dark.', 'It is dark here, and no lamp says otherwise.']
	}
} as const;

export function lightingNow(
	lit: 'yes' | 'no',
	pavement: string | undefined,
	sun: number,
	variant = 0
): string {
	const hour = sun > 0 ? 'day' : sun > DARK ? 'dusk' : 'dark';
	const said = SAID[lit][hour][variant % 2];
	return pavement ? `${said} There is ${pavement}.` : said;
}
