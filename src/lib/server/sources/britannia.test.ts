import { describe, expect, it } from 'vitest';
import { britanniaBeyond } from './britannia';

// A box of invented country, and invented Roman things around it.
const box = '-0.09,51.37,-0.05,51.39';
const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features }) as never;
const line = (props: object, coords: number[][]) => ({
	type: 'Feature',
	properties: props,
	geometry: { type: 'LineString', coordinates: coords }
});
const point = (props: object, lon: number, lat: number) => ({
	type: 'Feature',
	properties: props,
	geometry: { type: 'Point', coordinates: [lon, lat] }
});

describe('britanniaBeyond (Digital Britannia, beyond the map)', () => {
	it('keeps roads and sites near the map, by their names and kinds as found', () => {
		const kept = britanniaBeyond(
			{
				roads: fc([
					line({ 'Road - Start and End': 'Inventa to Nowhere?', 'Road number': '999' }, [
						[-0.12, 51.36],
						[-0.11, 51.4]
					]),
					line({ 'Road - Start and End': 'Far Away' }, [
						[1.5, 52.5],
						[1.6, 52.6]
					])
				]),
				settlement: fc([
					point(
						{ SITE_NAME: 'Inventon', 'ROMAN NAME': 'INVENTVM?', TYPE: 'Vicus - large  >9Ha' },
						-0.02,
						51.37
					)
				]),
				military: fc([point({ 'Modern Name': 'Fortham', 'Main site type': 'Fort' }, -0.07, 51.42)])
			},
			box
		);
		expect(kept).toEqual([
			{
				name: 'Inventa to Nowhere?',
				kind: 'a Roman road',
				points: [
					[51.36, -0.12],
					[51.4, -0.11]
				]
			},
			{
				name: 'Inventon',
				also: 'INVENTVM?',
				kind: 'Vicus - large  >9Ha',
				points: [[51.37, -0.02]]
			},
			{ name: 'Fortham', kind: 'Fort', points: [[51.42, -0.07]] }
		]);
	});

	it('passes over what it cannot name or place', () => {
		expect(
			britanniaBeyond({ settlement: fc([point({ TYPE: 'Vicus' }, -0.02, 51.37)]) }, box)
		).toEqual([]);
	});
});
