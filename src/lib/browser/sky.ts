import { heavensFacts } from '../core/adapters/heavens';
import { currentWeatherFacts, type OpenMeteoCurrent } from '../core/adapters/weather';
import type { Fact } from '../core/facts';

/** Where to ask about the weather: the map's own place, never the reader's. */
export interface WeatherAt {
	latitude: number;
	longitude: number;
}

/**
 * The weather now, from Open-Meteo, asked from the reader's browser as they read. Nothing at all
 * when there is no answer in time: Guide then says nothing of the weather.
 */
export async function fetchWeatherNow(
	at: WeatherAt | undefined,
	get: (url: string) => Promise<Response> = (url) => fetch(url),
	timeoutMs = 3000
): Promise<Fact[]> {
	if (!at) return [];
	const url =
		`https://api.open-meteo.com/v1/forecast?latitude=${at.latitude}&longitude=${at.longitude}` +
		'&current=weather_code,temperature_2m&timezone=Europe%2FLondon';
	const late = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('no answer in time')), timeoutMs)
	);
	try {
		const res = await Promise.race([get(url), late]);
		if (!res.ok) return [];
		return currentWeatherFacts((await Promise.race([res.json(), late])) as OpenMeteoCurrent);
	} catch {
		return [];
	}
}

/** The sky now over the map's own place: the sun and moon, worked out here, and the weather, if asked in time. */
export async function skyNow(
	at: WeatherAt | undefined,
	now = new Date(),
	get?: (url: string) => Promise<Response>
): Promise<Fact[]> {
	return [...heavensFacts(now, at), ...(await fetchWeatherNow(at, get))];
}
