import { describe, expect, it } from 'vitest';
import { OsmIndex } from '../osm';
import { OsmAdapter } from './osm';

const index = new OsmIndex({
	elements: [
		{ type: 'node', id: 1, lat: 51.38, lon: -0.07 },
		{ type: 'node', id: 2, lat: 51.3801, lon: -0.07 },
		{ type: 'node', id: 3, lat: 51.3801, lon: -0.0699 },
		{
			type: 'way',
			id: 10,
			nodes: [1, 2, 3, 1],
			timestamp: '2024-03-02T10:00:00Z',
			tags: {
				building: 'retail',
				old_name: 'est Bank',
				'survey:date': '2018-10-04',
				source: 'survey'
			}
		},
		{
			type: 'way',
			id: 11,
			nodes: [1, 2],
			timestamp: '2025-01-01T00:00:00Z',
			tags: { highway: 'residential' }
		},
		{
			type: 'node',
			id: 4,
			lat: 51.38,
			lon: -0.07,
			timestamp: '2022-05-05T00:00:00Z',
			tags: { shop: 'bakery' }
		},
		{ type: 'node', id: 5, lat: 51.38, lon: -0.07, tags: { highway: 'bus_stop' } }
	]
});

const facts = new OsmAdapter(index).facts();

describe('OsmAdapter', () => {
	it('turns each tag into one fact about its element', () => {
		const claims = facts.filter((f) => f.subject === 'way/10').map((f) => f.claim);
		expect(claims).toContainEqual({ key: 'old_name', value: 'est Bank' });
		expect(claims).toContainEqual({ key: 'building', value: 'retail' });
	});

	it('keeps values exactly as found', () => {
		expect(facts.find((f) => f.claim.key === 'old_name')!.claim.value).toBe('est Bank');
	});

	it('leaves out provenance tags', () => {
		expect(facts.some((f) => f.claim.key === 'source')).toBe(false);
	});

	it('prefers the survey date over the edit date', () => {
		const f = facts.find((f) => f.subject === 'way/10')!;
		expect(f.observed).toBe('2018-10-04');
		expect(f.observedBy).toBe('survey');
	});

	it('falls back to the date of the last edit', () => {
		const f = facts.find((f) => f.subject === 'node/4')!;
		expect(f.observed).toBe('2022-05-05');
		expect(f.observedBy).toBe('edit');
	});

	it('gives each fact a stable id and its source', () => {
		const f = facts.find((f) => f.claim.key === 'shop')!;
		expect(f.id).toBe('osm:node/4:shop');
		expect(f.source).toBe('osm');
	});

	it('skips untagged nodes', () => {
		expect(facts.some((f) => f.subject === 'node/1')).toBe(false);
	});

	it('gives streets the street reach and highway nodes the feature reach', () => {
		const reach = (subject: string) => facts.find((f) => f.subject === subject)!.reach;
		expect(reach('way/11')).toBe(15);
		expect(reach('node/5')).toBe(30);
	});

	it('carries the element geometry', () => {
		expect(facts.find((f) => f.subject === 'way/11')!.geometry).toHaveLength(2);
	});

	it('tells an area drawn as a multipolygon by its tags, at its outer edge, as a closed way is told', () => {
		const drawn = new OsmIndex({
			elements: [
				{ type: 'node', id: 1, lat: 51.38, lon: -0.07 },
				{ type: 'node', id: 2, lat: 51.381, lon: -0.07 },
				{ type: 'node', id: 3, lat: 51.381, lon: -0.069 },
				{ type: 'node', id: 6, lat: 51.37, lon: -0.07 },
				{ type: 'way', id: 12, nodes: [1, 2, 3] },
				{ type: 'way', id: 13, nodes: [3, 1] },
				{ type: 'way', id: 14, nodes: [6, 1] },
				{
					type: 'relation',
					id: 20,
					timestamp: '2023-06-01T00:00:00Z',
					tags: { type: 'multipolygon', leisure: 'park', name: 'Inventa Fields' },
					members: [
						{ type: 'way', ref: 12, role: 'outer' },
						{ type: 'way', ref: 13, role: 'outer' }
					]
				},
				{
					type: 'relation',
					id: 21,
					tags: { type: 'multipolygon', natural: 'wood' },
					members: [{ type: 'way', ref: 14, role: 'outer' }]
				}
			]
		});
		const told = new OsmAdapter(drawn).facts().filter((f) => f.subject === 'relation/20');
		expect(told.map((f) => f.claim)).toEqual([
			{ key: 'leisure', value: 'park' },
			{ key: 'name', value: 'Inventa Fields' }
		]);
		expect(told[0].geometry).toHaveLength(4);
		expect(told[0].observed).toBe('2023-06-01');
		expect(new OsmAdapter(drawn).facts().some((f) => f.subject === 'relation/21')).toBe(false);
	});
});
