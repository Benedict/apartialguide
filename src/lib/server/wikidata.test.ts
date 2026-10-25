import { describe, expect, it } from 'vitest';
import { itemFromEntity, qidsInSnapshot } from './wikidata';

describe('itemFromEntity', () => {
	it('takes the British English label and description, falling back on English', () => {
		const item = itemFromEntity({
			labels: { en: { value: 'Ada Inventa' }, 'en-gb': { value: 'Ada Inventa (gb)' } },
			descriptions: { en: { value: 'invented engineer' } }
		});
		expect(item).toEqual({ label: 'Ada Inventa (gb)', description: 'invented engineer' });
	});

	it('gives the inception as precisely as Wikidata has it', () => {
		const at = (time: string, precision: number) =>
			itemFromEntity({
				claims: { P571: [{ mainsnak: { datavalue: { value: { time, precision } } } }] }
			}).inception;
		expect(at('+1868-00-00T00:00:00Z', 9)).toBe('1868');
		expect(at('+1868-05-00T00:00:00Z', 10)).toBe('1868-05');
		expect(at('+1868-05-01T00:00:00Z', 11)).toBe('1868-05-01');
		expect(at('+1800-00-00T00:00:00Z', 7)).toBeUndefined();
	});

	it('takes where Wikidata places it', () => {
		const item = itemFromEntity({
			claims: {
				P625: [{ mainsnak: { datavalue: { value: { latitude: 51.38, longitude: -0.07 } } } }]
			}
		});
		expect(item.coordinates).toEqual([51.38, -0.07]);
	});

	it('is empty for a missing entity', () => {
		expect(itemFromEntity({ missing: '' })).toEqual({});
	});
});

describe('qidsInSnapshot', () => {
	it('gathers what the map links to and what its names are for, and nothing else', () => {
		const qids = qidsInSnapshot({
			elements: [
				{ type: 'node', id: 1, lat: 0, lon: 0, tags: { wikidata: 'Q1', 'brand:wikidata': 'Q9' } },
				{ type: 'way', id: 2, nodes: [], tags: { 'name:etymology:wikidata': 'Q2;Q3' } },
				{ type: 'way', id: 3, nodes: [], tags: { wikidata: 'Q1' } }
			]
		});
		expect(qids).toEqual(['Q1', 'Q2', 'Q3']);
	});
});
