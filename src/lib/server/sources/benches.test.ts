import { describe, expect, it } from 'vitest';
import { benchRecords } from './benches';

const box = '-0.09,51.37,-0.06,51.39';
const feature = (id: number, lon: number, lat: number, popupContent: string) => ({
	id,
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [lon, lat] },
	properties: { popupContent }
});

describe('benchRecords (OpenBenches, as GeoJSON)', () => {
	it('takes each bench in the box with its inscription, lines kept apart, markup undone', () => {
		const records = benchRecords(
			{
				features: [
					feature(
						7,
						-0.07,
						51.38,
						'In memory of Ada Inventa<br />who sat here &amp; watched<br>1900&#039;s'
					),
					feature(8, 0.5, 51.5, 'Outside the box')
				]
			},
			box
		);
		expect(records).toEqual([
			{
				id: '7',
				at: [51.38, -0.07],
				near: { key: 'amenity', value: 'bench', within: 15 },
				claims: {
					kind: 'bench',
					inscription: 'In memory of Ada Inventa / who sat here & watched / 1900’s'.replace(
						'’',
						"'"
					)
				}
			}
		]);
	});

	it('skips a bench without words', () => {
		expect(benchRecords({ features: [feature(9, -0.07, 51.38, ' <br/> ')] }, box)).toEqual([]);
	});

	it('keeps lines apart however the feed breaks them', () => {
		const [record] = benchRecords(
			{ features: [feature(10, -0.07, 51.38, 'IN LOVING MEMORY\r\nOF ADA\nINVENTA')] },
			box
		);
		expect(record.claims.inscription).toBe('IN LOVING MEMORY / OF ADA / INVENTA');
	});
});
