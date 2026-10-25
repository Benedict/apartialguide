import { describe, expect, it } from 'vitest';
import { wardAreas } from './wards';

describe('wardAreas (ONS boundaries, as ArcGIS GeoJSON)', () => {
	it('takes each ward with its name as found, its outer rings turned to latitude first', () => {
		const areas = wardAreas({
			features: [
				{
					properties: { WD24CD: 'E05099991', WD24NM: 'Inventa West', LAD24NM: 'Invented Borough' },
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[-0.08, 51.37],
								[-0.07, 51.37],
								[-0.07, 51.38],
								[-0.08, 51.37]
							],
							[
								[-0.075, 51.372],
								[-0.074, 51.372],
								[-0.074, 51.373],
								[-0.075, 51.372]
							]
						]
					}
				},
				{
					properties: { WD24CD: 'E05099992', WD24NM: 'Inventa East' },
					geometry: {
						type: 'MultiPolygon',
						coordinates: [
							[
								[
									[0, 1],
									[1, 1],
									[0, 1]
								]
							],
							[
								[
									[2, 3],
									[3, 3],
									[2, 3]
								]
							]
						]
					}
				}
			]
		});
		expect(areas).toEqual([
			{
				id: 'E05099991',
				name: 'Inventa West',
				kind: 'ward',
				rings: [
					[
						[51.37, -0.08],
						[51.37, -0.07],
						[51.38, -0.07],
						[51.37, -0.08]
					]
				]
			},
			{
				id: 'E05099992',
				name: 'Inventa East',
				kind: 'ward',
				rings: [
					[
						[1, 0],
						[1, 1],
						[1, 0]
					],
					[
						[3, 2],
						[3, 3],
						[3, 2]
					]
				]
			}
		]);
	});

	it('skips a ward without a name or a shape', () => {
		expect(
			wardAreas({
				features: [
					{ properties: { WD24CD: 'E05099993' }, geometry: { type: 'Polygon', coordinates: [] } },
					{ properties: { WD24CD: 'E05099994', WD24NM: 'Inventa North' }, geometry: null }
				]
			})
		).toEqual([]);
	});
});
