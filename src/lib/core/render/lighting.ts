/** Below this the sun has gone and the sky is dark; between it and the horizon, dusk. */
const DARK = -6;

/**
 * A street's lighting said for the hour: the map says whether it is lit, and the sun, worked out
 * for now, says whether it is dark. Guide never says the lamps are seen to be on.
 */
export function lightingNow(lit: 'yes' | 'no', pavement: string | undefined, sun: number): string {
	const hour = sun > 0 ? 'day' : sun > DARK ? 'dusk' : 'dark';
	const said =
		lit === 'yes'
			? {
					day: 'Lit at night, though it is day now',
					dusk: 'Lit at night, and night is coming on',
					dark: 'Lit, and it is dark now'
				}[hour]
			: { day: 'Unlit', dusk: 'Unlit, and the light is going', dark: 'Unlit, and it is dark now' }[
					hour
				];
	return `${said}${pavement ? `, with ${pavement}` : ''}.`;
}
