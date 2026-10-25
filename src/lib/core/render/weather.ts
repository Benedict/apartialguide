import type { Fact } from '../facts';

/** WMO weather codes, in words. */
const SKY: Record<number, string> = {
	0: 'clear',
	1: 'mostly clear',
	2: 'partly cloudy',
	3: 'overcast',
	45: 'fog',
	48: 'freezing fog',
	51: 'light drizzle',
	53: 'drizzle',
	55: 'heavy drizzle',
	56: 'freezing drizzle',
	57: 'freezing drizzle',
	61: 'light rain',
	63: 'rain',
	65: 'heavy rain',
	66: 'freezing rain',
	67: 'freezing rain',
	71: 'light snow',
	73: 'snow',
	75: 'heavy snow',
	77: 'snow grains',
	80: 'showers',
	81: 'showers',
	82: 'heavy showers',
	85: 'snow showers',
	86: 'snow showers',
	95: 'thunder',
	96: 'thunder and hail',
	99: 'thunder and hail'
};

/** "Overcast that day, 2 to 5 °C.", from the weather facts of that day, or nothing. */
export function weatherThatDay(
	facts: readonly Fact[],
	date: string | undefined
): string | undefined {
	if (!date) return undefined;
	const day = Object.fromEntries(
		facts.filter((f) => f.subject === `weather/${date}`).map((f) => [f.claim.key, f.claim.value])
	);
	const sky = SKY[Number(day['weather:code'])];
	if (day['weather:code'] === undefined || !sky) return undefined;
	const min = day['weather:temperature_min'];
	const max = day['weather:temperature_max'];
	const [low, high] = [min, max].map((t) => (t === undefined ? undefined : Math.round(Number(t))));
	const temperature =
		low === undefined || high === undefined
			? ''
			: low === high
				? `, ${low} °C`
				: `, ${low} to ${high} °C`;
	return `${sky.charAt(0).toUpperCase()}${sky.slice(1)} that day${temperature}.`;
}
