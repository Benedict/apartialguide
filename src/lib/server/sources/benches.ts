import type { SourceRecord } from '../../core/adapters/records';
import { inBox } from './box';

interface BenchFeature {
	id?: number | string;
	geometry?: { coordinates?: number[] };
	properties?: { popupContent?: string; inscription?: string };
}

const ENTITIES: Record<string, string> = {
	amp: '&',
	quot: '"',
	apos: "'",
	lt: '<',
	gt: '>',
	nbsp: ' ',
	'#039': "'",
	'#39': "'"
};

/** An inscription as the bench bears it: its lines kept apart by “ / ”, the page's markup undone. */
function inscription(html: string): string {
	return html
		.split(/<br\s*\/?>/i)
		.map((line) =>
			line
				.replace(/<[^>]*>/g, '')
				.replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? m)
				.replace(/\s+/g, ' ')
				.trim()
		)
		.filter(Boolean)
		.join(' / ');
}

/**
 * Benches from OpenBenches, as GeoJSON: each in the box with its inscription. One goes with a bench
 * the map has within 15 m, or stands alone, called by its words.
 */
export function benchRecords(answer: { features?: BenchFeature[] }, box: string): SourceRecord[] {
	return (answer.features ?? []).flatMap((f) => {
		const [lon, lat] = f.geometry?.coordinates ?? [];
		const words = inscription(f.properties?.inscription ?? f.properties?.popupContent ?? '');
		if (typeof lat !== 'number' || typeof lon !== 'number' || !words || !inBox([lat, lon], box))
			return [];
		return [
			{
				id: String(f.id),
				at: [lat, lon] as [number, number],
				near: { key: 'amenity', value: 'bench', within: 15 },
				claims: { kind: 'bench', inscription: words }
			}
		];
	});
}
