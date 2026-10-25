import { describe, expect, it } from 'vitest';
import { bboxAroundBoundaries, placeCentre } from './area';

describe('bboxAroundBoundaries', () => {
	it('takes the box around every boundary Overpass matched, as minLon,minLat,maxLon,maxLat', () => {
		const answer = {
			elements: [
				{
					type: 'relation',
					id: 1,
					tags: { name: 'Invented West' },
					bounds: { minlat: 51.37, minlon: -0.093, maxlat: 51.385, maxlon: -0.072 }
				},
				{
					type: 'relation',
					id: 2,
					tags: { name: 'Invented East' },
					bounds: { minlat: 51.368, minlon: -0.075, maxlat: 51.389, maxlon: -0.056 }
				}
			]
		};
		expect(bboxAroundBoundaries(answer)).toEqual({
			bbox: '-0.093000,51.368000,-0.056000,51.389000',
			names: ['Invented West', 'Invented East']
		});
	});

	it('refuses an answer with no boundary in it', () => {
		expect(() => bboxAroundBoundaries({ elements: [] })).toThrow(/no boundary/);
	});
});

describe('placeCentre', () => {
	it('takes the point of the place itself, preferring a suburb to anything else of the name', () => {
		expect(
			placeCentre({
				elements: [
					{ type: 'node', lat: 51.1, lon: -0.1, tags: { place: 'locality', name: 'Inventon' } },
					{ type: 'node', lat: 51.2, lon: -0.2, tags: { place: 'suburb', name: 'Inventon' } }
				]
			})
		).toEqual([51.2, -0.2]);
	});

	it('refuses an answer with no place in it', () => {
		expect(() => placeCentre({ elements: [] })).toThrow(/no place/);
	});
});
