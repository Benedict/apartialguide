import type { Fact } from '../facts';

/** Open-Meteo's air quality now, as its air quality API answers with `current`. */
export interface OpenMeteoAir {
	current?: { time?: string; european_aqi?: number | null };
}

/** The air now, as a fact about now, observed when Open-Meteo gave it. */
export function currentAirFacts(answer: OpenMeteoAir): Fact[] {
	const { time, european_aqi } = answer.current ?? {};
	if (!time || typeof european_aqi !== 'number') return [];
	return [
		{
			id: 'air:now:index',
			subject: 'air/now',
			claim: { key: 'air:index', value: String(european_aqi) },
			source: 'Open-Meteo.com',
			observed: time,
			reach: 0,
			geometry: []
		}
	];
}
