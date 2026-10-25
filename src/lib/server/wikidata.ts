import type { WikidataItem } from '../core/adapters/wikidata';
import type { OsmData } from '../core/osm';

/** The parts of a Wikidata entity, from wbgetentities, that the piece reads. */
export interface WikidataEntity {
	missing?: string;
	labels?: Record<string, { value: string }>;
	descriptions?: Record<string, { value: string }>;
	claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
}

const LANGUAGES = ['en-gb', 'en'];
/** Wikidata time precisions: year, month, day. Coarser ones say too little to speak. */
const PRECISION: Record<number, number> = { 9: 4, 10: 7, 11: 10 };
/** Tags whose value is an item the thing is, or is named for. Brands and operators are left out. */
const LINKS = ['wikidata', 'name:etymology:wikidata'];

const text = (values?: Record<string, { value: string }>) =>
	LANGUAGES.map((l) => values?.[l]?.value).find(Boolean);

const first = (entity: WikidataEntity, property: string) =>
	entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value as Record<string, unknown> | undefined;

/** One entity as the store keeps it, every value as Wikidata has it. */
export function itemFromEntity(entity: WikidataEntity): WikidataItem {
	if (entity.missing !== undefined) return {};
	const item: WikidataItem = {};
	const label = text(entity.labels);
	const description = text(entity.descriptions);
	if (label) item.label = label;
	if (description) item.description = description;
	const inception = first(entity, 'P571');
	const length = PRECISION[Number(inception?.precision)];
	if (typeof inception?.time === 'string' && length)
		item.inception = inception.time.replace(/^\+/, '').slice(0, length);
	const place = first(entity, 'P625');
	if (typeof place?.latitude === 'number' && typeof place?.longitude === 'number')
		item.coordinates = [place.latitude, place.longitude];
	return item;
}

/** Every item the snapshot links to or names something for, once each, in order. */
export function qidsInSnapshot(data: OsmData): string[] {
	const qids = new Set<string>();
	for (const e of data.elements)
		for (const key of LINKS)
			for (const qid of e.tags?.[key]?.split(';') ?? [])
				if (/^Q\d+$/.test(qid.trim())) qids.add(qid.trim());
	return [...qids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}
