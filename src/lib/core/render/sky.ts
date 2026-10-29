import type { Fact } from '../facts';
import { compassLabel } from '../geo';

/** Below this the sun has gone and the sky is the moon's. */
const DARK = -6;

/** The moon's place in its month, in words. */
export function moonPhaseWords(phase: number): string {
	const names = [
		'new',
		'a waxing crescent',
		'at first quarter',
		'waxing gibbous',
		'full',
		'waning gibbous',
		'at last quarter',
		'a waning crescent'
	];
	return names[Math.round(phase * 8) % 8];
}

export const height = (altitude: number) => (altitude < 15 ? 'low' : altitude > 45 ? 'high' : 'up');

/** "The sun is low in the south-west.", from the facts about the sky now, or nothing. */
export function skyLine(facts: readonly Fact[]): string | undefined {
	const now = Object.fromEntries(
		facts.filter((f) => f.subject === 'sky/now').map((f) => [f.claim.key, Number(f.claim.value)])
	);
	const sun = now['sun:altitude'];
	if (sun === undefined) return undefined;
	if (sun > 0) return `The sun is ${height(sun)} in the ${compassLabel(now['sun:azimuth'])}.`;
	if (sun > DARK)
		return `The sun is just below the horizon, to the ${compassLabel(now['sun:azimuth'])}.`;
	const moon = now['moon:altitude'];
	if (moon === undefined || moon <= 0) return 'No moon.';
	return `The moon is ${height(moon)} in the ${compassLabel(now['moon:azimuth'])}, ${moonPhaseWords(now['moon:phase'])}.`;
}
