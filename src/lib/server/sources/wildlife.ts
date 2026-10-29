import type { SourceRecord } from '../../core/adapters/records';
import { inBox } from './box';

interface Occurrence {
	uuid?: string;
	decimalLatitude?: number;
	decimalLongitude?: number;
	vernacularName?: string;
	scientificName?: string;
	eventDate?: number | string;
	license?: string;
	coordinateUncertaintyInMeters?: number;
}

/** How loosely a sighting may be placed and still be told at a place, in metres. */
const PLACED_WITHIN = 100;
/** The patch a sighting stands for: one of each kind per patch, the latest. About 250 m. */
const PATCH = 0.0025;

/** Licences that let the words be used here: open, attributed, not barred from reuse. */
const reusable = (licence = '') =>
	/^(CC0|CC-BY(-4\.0)?|OGL|CC BY)/i.test(licence) && !/NC|ND/i.test(licence);

const day = (date: number | string | undefined) => {
	if (date === undefined) return undefined;
	const d = new Date(typeof date === 'number' ? date : date);
	return Number.isNaN(d.valueOf()) ? undefined : d.toISOString().slice(0, 10);
};

/**
 * Sightings of living things from the NBN Atlas: the latest of each kind in each patch of about
 * 250 m, named as the record names it (common name, else scientific), with the month it was seen.
 */
export function wildlifeRecords(
	answer: { occurrences?: Occurrence[] },
	box: string
): SourceRecord[] {
	const latest = new Map<string, SourceRecord>();
	for (const o of answer.occurrences ?? []) {
		const lat = o.decimalLatitude;
		const lon = o.decimalLongitude;
		const name = o.vernacularName?.trim() || o.scientificName?.trim();
		const when = day(o.eventDate);
		if (lat === undefined || lon === undefined || !name || !when) continue;
		if (!inBox([lat, lon], box) || !reusable(o.license)) continue;
		if ((o.coordinateUncertaintyInMeters ?? Infinity) > PLACED_WITHIN) continue;
		const key = `${name}|${Math.floor(lat / PATCH)}|${Math.floor(lon / PATCH)}`;
		const held = latest.get(key);
		if (held && held.observed! >= when) continue;
		latest.set(key, {
			id: o.uuid ?? key,
			at: [lat, lon],
			observed: when,
			claims: { name, seen: when.slice(0, 7) }
		});
	}
	return [...latest.values()];
}
