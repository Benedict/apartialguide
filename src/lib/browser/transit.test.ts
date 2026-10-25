import { describe, expect, it } from 'vitest';
import { fetchArrivals } from './transit';

const bus = [
	{
		id: 'b1',
		lineName: '410',
		destinationName: 'Invented Palace',
		timeToStation: 185,
		modeName: 'bus'
	}
];

describe('fetchArrivals', () => {
	it('asks TfL for a bus stop’s arrivals by its NaPTAN code', async () => {
		const asked: string[] = [];
		const facts = await fetchArrivals(
			{ name: 'Invented Road', kind: 'bus', naptan: '490000000X' },
			async (url) => {
				asked.push(url);
				return new Response(JSON.stringify(bus));
			}
		);
		expect(asked).toEqual(['https://api.tfl.gov.uk/StopPoint/490000000X/Arrivals']);
		expect(facts?.find((f) => f.claim.key === 'line')?.claim.value).toBe('410');
	});

	it('finds a tram stop at TfL by its mapped name, then asks for its arrivals', async () => {
		const asked: string[] = [];
		await fetchArrivals({ name: 'Inventon', kind: 'tram' }, async (url) => {
			asked.push(url);
			return new Response(
				JSON.stringify(
					url.includes('/Search/')
						? { matches: [{ id: '940GZZINVENT', name: 'Inventon Tram Stop' }] }
						: []
				)
			);
		});
		expect(asked).toEqual([
			'https://api.tfl.gov.uk/StopPoint/Search/Inventon?modes=tram',
			'https://api.tfl.gov.uk/StopPoint/940GZZINVENT/Arrivals'
		]);
	});

	it('is nothing without an answer in time, or a refusal', async () => {
		const stop = { name: 'Invented Road', kind: 'bus' as const, naptan: '490000000X' };
		expect(
			await fetchArrivals(stop, async () => new Response('', { status: 429 }))
		).toBeUndefined();
		expect(await fetchArrivals(stop, () => new Promise<Response>(() => {}), 20)).toBeUndefined();
	});
});
