import type { Fact } from '../facts';

/** Open-Meteo's weather now, as its forecast API answers with `current`. */
export interface OpenMeteoCurrent {
	current?: { time?: string; weather_code?: number | null; temperature_2m?: number | null };
}

/** The weather now, as facts about now, observed when Open-Meteo measured it. */
export function currentWeatherFacts(answer: OpenMeteoCurrent): Fact[] {
	const { time, weather_code, temperature_2m } = answer.current ?? {};
	if (!time) return [];
	const claims: [string, number | null | undefined][] = [
		['weather:code', weather_code],
		['weather:temperature', temperature_2m]
	];
	return claims
		.filter((c): c is [string, number] => typeof c[1] === 'number')
		.map(([key, value]) => ({
			id: `weather:now:${key}`,
			subject: 'weather/now',
			claim: { key, value: String(value) },
			source: 'Open-Meteo.com',
			observed: time,
			reach: 0,
			geometry: []
		}));
}
