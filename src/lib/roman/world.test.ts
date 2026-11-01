import { describe, expect, it } from 'vitest';
import { romanWorld, type RomanLayers } from './world';

// Invented country: two roads crossing at an invented settlement, a fort along one, a milestone on the other.
const road = (props: Record<string, unknown>, coords: number[][]) => ({
	properties: props,
	geometry: { type: 'LineString', coordinates: coords }
});
const point = (props: Record<string, unknown>, lon: number, lat: number) => ({
	properties: props,
	geometry: { type: 'Point', coordinates: [lon, lat] }
});
const layers: RomanLayers = {
	roads: {
		features: [
			road({ 'Road - Start and End': 'Inventa to Nowhere?', 'Segment Confidence': 3 }, [
				[0, 51],
				[0, 51.1],
				[0, 51.2]
			]),
			road({ 'Road - Start and End': 'Westway to Eastend', 'Segment Confidence': 1 }, [
				[-0.15, 51.1],
				[0, 51.1],
				[0.15, 51.1]
			])
		]
	},
	settlement: {
		features: [
			point(
				{ SITE_NAME: 'Inventon', 'ROMAN NAME': 'INVENTVM?', TYPE: 'Vicus - large  >9Ha' },
				0,
				51.1
			)
		]
	},
	military: {
		features: [
			point(
				{
					'Modern Name': 'Fortham',
					'Main site type': 'Fort',
					'Type - Flavian AD69-96': 'Fort',
					'Type - 4th Century': 'Fortlet'
				},
				0.002,
				51.2
			)
		]
	},
	milestones: {
		features: [
			point(
				{
					'Site name': 'Stonebury',
					Inscription: 'IMP CAES',
					'Inscription Translation': 'For the Emperor Caesar'
				},
				0.15,
				51.1
			)
		]
	}
};
const confidence = { '3': 'Certain - +/- 30m', '1': 'Conjectured' };

describe('romanWorld (Roman roads and sites as a walk)', () => {
	const world = romanWorld(layers, { confidence, start: 'Inventon' });
	const at = (title: string) => Object.values(world.stops).find((s) => s.title === title)!;

	it('makes a stop where roads meet at a site, and at each road’s ends and sites', () => {
		expect(
			Object.values(world.stops)
				.map((s) => s.title)
				.sort()
		).toEqual(
			['Fortham', 'Inventon', 'Stonebury', 'Inventa to Nowhere?', 'Westway to Eastend'].sort()
		);
		expect(world.stops[world.start].title).toBe('Inventon');
	});

	it('tells the site as kept, its Roman name as hearsay, and each road with its confidence as found', () => {
		const text = at('Inventon').paragraphs.join(' ');
		expect(text).toContain('Inventon');
		expect(text).toContain('Vicus - large  >9Ha');
		expect(text).toContain('It is said it was called “INVENTVM?”.');
		expect(text).toContain('Inventa to Nowhere?');
		expect(text).toContain('Certain - +/- 30m');
		expect(text).toContain('Conjectured');
	});

	it('gives a fort its kind in each age kept, and a milestone its words as they are', () => {
		const fort = at('Fortham').paragraphs.join(' ');
		expect(fort).toContain('Flavian AD69-96: Fort');
		expect(fort).toContain('4th Century: Fortlet');
		const stone = at('Stonebury').paragraphs.join(' ');
		expect(stone).toContain('“IMP CAES”');
		expect(stone).toContain('“For the Emperor Caesar”');
	});

	it('leads each way along a road by compass, naming the road and how far', () => {
		const exits = at('Inventon').exits;
		expect(exits.map((e) => e.label).sort()).toEqual(['east', 'north', 'south', 'west']);
		const north = exits.find((e) => e.label === 'north')!;
		expect(world.stops[north.to].title).toBe('Fortham');
		expect(north.street).toBe('Inventa to Nowhere?');
		expect(at('Inventon').paragraphs.at(-1)).toMatch(/north, 11 km along “Inventa to Nowhere\?”/);
	});

	it('puts every stop where the data puts it', () => {
		expect(at('Inventon').at).toEqual([51.1, 0]);
	});
});
