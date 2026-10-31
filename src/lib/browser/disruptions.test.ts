import { describe, expect, it } from 'vitest';
import { fetchDisruptions } from './disruptions';

// An invented disruption on an invented road.
const answer = [
	{
		id: 'T1',
		category: 'Works',
		comments: 'Invented Road - Lane closed.',
		endDateTime: '2999-01-01T00:00:00Z',
		lastModifiedTime: '2026-10-30T09:00:00Z',
		geography: { type: 'Point', coordinates: [-0.07, 51.3801] }
	}
];

describe('fetchDisruptions', () => {
	it('asks TfL for the disruptions once, and keeps them while the reader walks', async () => {
		const asked: string[] = [];
		const get = async (url: string) => {
			asked.push(url);
			return new Response(JSON.stringify(answer));
		};
		const near = await fetchDisruptions([51.38, -0.07], get, 1000, 1);
		await fetchDisruptions([51.38, -0.07], get, 1000, 2);
		expect(asked).toEqual(['https://api.tfl.gov.uk/Road/all/Disruption?stripContent=true']);
		expect(near?.find((f) => f.claim.key === 'comments')?.claim.value).toBe(
			'Invented Road - Lane closed.'
		);
	});

	it('says nothing without an answer', async () => {
		const failing = async () => new Response('', { status: 500 });
		expect(await fetchDisruptions([51.38, -0.07], failing, 1000, 1e12)).toBeUndefined();
	});
});
