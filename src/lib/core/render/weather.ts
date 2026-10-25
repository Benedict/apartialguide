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

/** "Today: light rain, 11 °C.", from the weather facts about now, or nothing. */
export function weatherNow(facts: readonly Fact[]): string | undefined {
	const now = Object.fromEntries(
		facts.filter((f) => f.subject === 'weather/now').map((f) => [f.claim.key, f.claim.value])
	);
	const sky = SKY[Number(now['weather:code'])];
	if (now['weather:code'] === undefined || !sky) return undefined;
	const t = now['weather:temperature'];
	return `Today: ${sky}${t === undefined ? '' : `, ${Math.round(Number(t))} °C`}.`;
}
