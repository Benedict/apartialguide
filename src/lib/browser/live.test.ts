import { describe, expect, it } from 'vitest';
import { fetchCamera, fetchFlights, fetchSatellites } from './live';

const at = { latitude: 51.5, longitude: -0.1 };
const json = (body: unknown, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { headers });

const place = (id: string, distance: number, available = 'true') => ({
	id,
	commonName: `Invented Rd ${id}`,
	distance,
	lat: 51.5,
	lon: -0.09,
	additionalProperties: [
		{ key: 'available', value: available },
		{ key: 'imageUrl', value: `https://example.org/${id}.jpg` }
	]
});

describe('fetchCamera', () => {
	it('asks TfL for cameras around where the map puts the place, and keeps the nearest that works', async () => {
		const asked: string[] = [];
		const facts = await fetchCamera(at, async (url, init) => {
			asked.push(`${init?.method ?? 'GET'} ${url}`);
			if (url.endsWith('.jpg'))
				return new Response(null, {
					headers: { 'Last-Modified': 'Thu, 29 Oct 2026 19:35:26 GMT' }
				});
			return json({
				places: [place('far', 900), place('broken', 100, 'false'), place('near', 400)]
			});
		});
		expect(asked[0]).toBe(
			'GET https://api.tfl.gov.uk/Place?type=JamCam&lat=51.5&lon=-0.1&radius=1500'
		);
		expect(asked[1]).toBe('GET https://example.org/near.jpg');
		const claims = Object.fromEntries(facts!.map((f) => [f.claim.key, f.claim.value]));
		expect(claims).toMatchObject({
			name: 'Invented Rd near',
			image: 'https://example.org/near.jpg',
			taken: '2026-10-29T19:35:26.000Z'
		});
	});

	it('is an empty answer when no camera is near, and nothing without an answer', async () => {
		expect(await fetchCamera(at, async () => json({ places: [] }))).toEqual([]);
		expect(await fetchCamera(at, async () => new Response('no', { status: 500 }))).toBeUndefined();
	});
});

describe('fetchSatellites', () => {
	it('asks CelesTrak for the bright satellites once, and keeps the answer a while', async () => {
		const kept = new Map<string, string>();
		const store = {
			getItem: (k: string) => kept.get(k) ?? null,
			setItem: (k: string, v: string) => void kept.set(k, v)
		};
		let asked = 0;
		const get = async () => {
			asked++;
			return json([{ OBJECT_NAME: 'INVENTED', NORAD_CAT_ID: 1 }]);
		};
		const now = new Date('2026-10-29T19:00:00Z');
		expect(await fetchSatellites(get, store, now)).toEqual([
			{ OBJECT_NAME: 'INVENTED', NORAD_CAT_ID: 1 }
		]);
		await fetchSatellites(get, store, new Date('2026-10-29T21:00:00Z'));
		expect(asked).toBe(1);
		await fetchSatellites(get, store, new Date('2026-10-30T09:00:00Z'));
		expect(asked).toBe(2);
	});

	it('is nothing without an answer', async () => {
		expect(
			await fetchSatellites(async () => new Response('', { status: 403 }), undefined)
		).toBeUndefined();
	});
});

describe('fetchFlights', () => {
	it('asks the flights function it is given, and nothing without one', async () => {
		const asked: string[] = [];
		const answer = await fetchFlights('https://flights.example.org/', async (url) => {
			asked.push(url);
			return json({ ac: [] });
		});
		expect(asked).toEqual(['https://flights.example.org/']);
		expect(answer).toEqual({ ac: [] });
		expect(await fetchFlights(undefined)).toBeUndefined();
	});
});
