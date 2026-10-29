import { describe, expect, it } from 'vitest';
import { wildlifeRecords } from './wildlife';

const box = '-0.09,51.37,-0.06,51.39';
const seen = (o: Record<string, unknown>) => ({
	decimalLatitude: 51.38,
	decimalLongitude: -0.07,
	vernacularName: 'Invented Fox',
	scientificName: 'Vulpes inventa',
	eventDate: Date.UTC(2021, 5, 14),
	license: 'CC-BY',
	coordinateUncertaintyInMeters: 10,
	...o
});

describe('wildlifeRecords (NBN Atlas occurrences)', () => {
	it('keeps the latest sighting of each kind in each patch, its name and month as found', () => {
		const records = wildlifeRecords(
			{
				occurrences: [
					seen({ uuid: 'a', eventDate: Date.UTC(2019, 2, 1) }),
					seen({ uuid: 'b' }),
					seen({
						uuid: 'c',
						vernacularName: 'Invented Wren',
						scientificName: 'Troglodytes inventus'
					})
				]
			},
			box
		);
		expect(records).toEqual([
			{
				id: 'b',
				at: [51.38, -0.07],
				observed: '2021-06-14',
				claims: { name: 'Invented Fox', seen: '2021-06' }
			},
			{
				id: 'c',
				at: [51.38, -0.07],
				observed: '2021-06-14',
				claims: { name: 'Invented Wren', seen: '2021-06' }
			}
		]);
	});

	it('leaves out what is outside the box, placed loosely, licensed against reuse, or unnamed', () => {
		const records = wildlifeRecords(
			{
				occurrences: [
					seen({ uuid: 'd', decimalLatitude: 52 }),
					seen({ uuid: 'e', coordinateUncertaintyInMeters: 1000 }),
					seen({ uuid: 'f', license: 'CC-BY-NC' }),
					seen({ uuid: 'g', vernacularName: undefined, scientificName: undefined })
				]
			},
			box
		);
		expect(records).toEqual([]);
	});

	it('names a kind by its scientific name when it has no common one', () => {
		const [r] = wildlifeRecords(
			{ occurrences: [seen({ uuid: 'h', vernacularName: undefined })] },
			box
		);
		expect(r.claims.name).toBe('Vulpes inventa');
	});
});
