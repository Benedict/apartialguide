import { describe, expect, it } from 'vitest';
import { flightsHandler } from './flights';

const config = {
	LATITUDE: '51.38',
	LONGITUDE: '-0.07',
	ALLOWED_ORIGIN: 'https://invented.example'
};
const upstream = {
	ac: [
		{
			hex: 'a',
			flight: 'INV1 ',
			alt_baro: 5800,
			track: 91,
			lat: 51.39,
			lon: -0.07,
			squawk: '7000',
			r: 'G-INVD'
		}
	]
};

describe('flightsHandler (the flights function)', () => {
	it('asks adsb.lol about the map’s own place only, and lets the page read the answer', async () => {
		const asked: string[] = [];
		const res = await flightsHandler(
			new Request('https://flights.example/?lat=0&lon=0'),
			config,
			async (url) => {
				asked.push(String(url));
				return new Response(JSON.stringify(upstream));
			}
		);
		expect(asked).toEqual(['https://api.adsb.lol/v2/lat/51.38/lon/-0.07/dist/6']);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://invented.example');
		expect(res.headers.get('Cache-Control')).toMatch(/max-age=\d+/);
		expect(await res.json()).toEqual({
			ac: [{ hex: 'a', flight: 'INV1 ', alt_baro: 5800, track: 91, lat: 51.39, lon: -0.07 }]
		});
	});

	it('answers only GET', async () => {
		const res = await flightsHandler(
			new Request('https://flights.example/', { method: 'POST' }),
			config,
			fetch
		);
		expect(res.status).toBe(405);
	});

	it('says so when adsb.lol does not answer', async () => {
		const res = await flightsHandler(new Request('https://flights.example/'), config, async () => {
			throw new Error('down');
		});
		expect(res.status).toBe(502);
	});
});
