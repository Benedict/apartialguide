import type { WeatherDay } from '../core/adapters/weather';
import type { OsmData } from '../core/osm';

/** Open-Meteo's daily series, as its archive and forecast APIs answer. */
export interface OpenMeteoDaily {
	daily?: Record<string, (number | string | null)[]>;
}

export const DAILY = [
	'weather_code',
	'temperature_2m_min',
	'temperature_2m_max',
	'precipitation_sum',
	'wind_speed_10m_max'
];
const FIELDS: [string, keyof WeatherDay][] = [
	['weather_code', 'code'],
	['temperature_2m_min', 'temperatureMin'],
	['temperature_2m_max', 'temperatureMax'],
	['precipitation_sum', 'precipitation'],
	['wind_speed_10m_max', 'windMax']
];
const SURVEY_KEYS = ['survey:date', 'check_date', 'survey_date'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The days asked for, with what was measured on each; a day with nothing measured is left out. */
export function daysFromOpenMeteo(answer: OpenMeteoDaily, wanted: readonly string[]): WeatherDay[] {
	const daily = answer.daily ?? {};
	const days: WeatherDay[] = [];
	(daily.time ?? []).forEach((date, i) => {
		if (typeof date !== 'string' || !wanted.includes(date)) return;
		const day: WeatherDay = { date };
		for (const [series, field] of FIELDS) {
			const value = daily[series]?.[i];
			if (typeof value === 'number') (day as unknown as Record<string, number>)[field] = value;
		}
		if (Object.keys(day).length > 1) days.push(day);
	});
	return days;
}

/** The days the map records: the snapshot's, the past maps', and every full survey date in it. */
export function recordedDates(from: {
	snapshotDate: string;
	historyDates: readonly string[];
	snapshot: OsmData;
}): string[] {
	const dates = new Set([from.snapshotDate, ...from.historyDates]);
	for (const e of from.snapshot.elements)
		for (const key of SURVEY_KEYS) {
			const value = e.tags?.[key];
			if (value && DAY.test(value)) dates.add(value);
		}
	return [...dates].sort();
}
