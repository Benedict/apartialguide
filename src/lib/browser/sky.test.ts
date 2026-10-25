import { describe, expect, it } from 'vitest';
import { fetchWeatherNow, skyNow } from './sky';

const answer = { current: { time: '2026-10-25T16:45', weather_code: 3, temperature_2m: 12 } };
const ok = (body: unknown) => async () => new Response(JSON.stringify(body));

describe('fetchWeatherNow', () => {
	it('asks Open-Meteo for the weather now at the map’s own place', async () => {
		let asked = '';
		const facts = await fetchWeatherNow({ latitude: 51.38, longitude: -0.07 }, async (url) => {
			asked = String(url);
			return new Response(JSON.stringify(answer));
		});
		expect(asked).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
		expect(asked).toContain('latitude=51.38&longitude=-0.07');
		expect(asked).toContain('current=weather_code,temperature_2m');
		expect(facts.map((f) => f.claim.key)).toEqual(['weather:code', 'weather:temperature']);
	});

	it('is nothing when there is no place, no answer, or a refusal', async () => {
		expect(await fetchWeatherNow(undefined, ok(answer))).toEqual([]);
		expect(
			await fetchWeatherNow({ latitude: 0, longitude: 0 }, async () => {
				throw new Error('offline');
			})
		).toEqual([]);
		expect(
			await fetchWeatherNow(
				{ latitude: 0, longitude: 0 },
				async () => new Response('', { status: 429 })
			)
		).toEqual([]);
	});

	it('gives up rather than keep the reader waiting', async () => {
		const never = () => new Promise<Response>(() => {});
		expect(await fetchWeatherNow({ latitude: 0, longitude: 0 }, never, 20)).toEqual([]);
	});
});

describe('skyNow', () => {
	it('gives the sun and moon even when the weather has no answer', async () => {
		const facts = await skyNow(
			{ latitude: 51.38, longitude: -0.07 },
			new Date('2026-06-21T12:00:00Z'),
			async () => {
				throw new Error('offline');
			}
		);
		expect(facts.map((f) => f.subject)).toEqual(Array(5).fill('sky/now'));
	});

	it('gives the weather beside them when there is word of it', async () => {
		const facts = await skyNow({ latitude: 51.38, longitude: -0.07 }, new Date(), ok(answer));
		expect(facts.filter((f) => f.subject === 'weather/now')).toHaveLength(2);
	});

	it('asks nothing of Open-Meteo when the reader has turned the weather off', async () => {
		let asked = false;
		const facts = await skyNow(
			{ latitude: 51.38, longitude: -0.07 },
			new Date('2026-06-21T12:00:00Z'),
			async () => {
				asked = true;
				return new Response(JSON.stringify(answer));
			},
			{ weather: false }
		);
		expect(asked).toBe(false);
		expect(facts.every((f) => f.subject === 'sky/now')).toBe(true);
	});
});
