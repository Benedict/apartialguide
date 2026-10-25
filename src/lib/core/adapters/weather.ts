import type { Fact, SourceAdapter } from '../facts';

/** The weather of one day, as the weather script took it. */
export interface WeatherDay {
	/** YYYY-MM-DD. */
	date: string;
	/** WMO weather code. */
	code?: number;
	/** °C. */
	temperatureMin?: number;
	temperatureMax?: number;
	/** mm. */
	precipitation?: number;
	/** km/h. */
	windMax?: number;
}

/** The weather on the days the map records, taken by `npm run weather`. */
export interface WeatherStore {
	/** Where the weather comes from, as it should be credited. */
	source: string;
	latitude: number;
	longitude: number;
	days: WeatherDay[];
}

const KEYS: [keyof WeatherDay, string][] = [
	['code', 'weather:code'],
	['temperatureMin', 'weather:temperature_min'],
	['temperatureMax', 'weather:temperature_max'],
	['precipitation', 'weather:precipitation'],
	['windMax', 'weather:wind_max']
];

/** Each recorded day's weather, as facts about that day. Not about a place: the sky over all of it. */
export class WeatherAdapter implements SourceAdapter {
	readonly name = 'weather';

	constructor(private readonly store: WeatherStore) {}

	facts(): Fact[] {
		return this.store.days.flatMap((day) =>
			KEYS.filter(([field]) => day[field] !== undefined && day[field] !== null).map(
				([field, key]) => ({
					id: `weather:${day.date}:${key}`,
					subject: `weather/${day.date}`,
					claim: { key, value: String(day[field]) },
					source: this.store.source,
					observed: day.date,
					reach: 0,
					geometry: []
				})
			)
		);
	}
}

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
