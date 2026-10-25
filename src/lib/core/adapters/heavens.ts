import { moonIllumination, moonPosition, sunPosition } from '../astronomy';
import type { Fact } from '../facts';

const SOURCE = 'calculated, after SunCalc';

/**
 * Where the sun and moon stand now over the map's own place, as facts about now. Worked out, not
 * asked of anyone, so they need no answer in time; like the weather, only ever for now.
 */
export function heavensFacts(
	date: Date,
	at: { latitude: number; longitude: number } | undefined
): Fact[] {
	if (!at) return [];
	const sun = sunPosition(date, at.latitude, at.longitude);
	const moon = moonPosition(date, at.latitude, at.longitude);
	const claims: [string, number][] = [
		['sun:altitude', sun.altitude],
		['sun:azimuth', sun.azimuth],
		['moon:altitude', moon.altitude],
		['moon:azimuth', moon.azimuth],
		['moon:phase', moonIllumination(date).phase]
	];
	const observed = date.toISOString();
	return claims.map(([key, value]) => ({
		id: `sky:now:${key}`,
		subject: 'sky/now',
		claim: { key, value: String(value) },
		source: SOURCE,
		observed,
		reach: 0,
		geometry: []
	}));
}
