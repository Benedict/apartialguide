import type { SourceRecord } from './records';

/**
 * What another source keeps that concerns a person more than a place, and so is left out of the
 * walk: a planning application whose words name someone, and a company registered anywhere but at
 * a shop, office or other premises the map has (one at a home is usually its director's home).
 * Records a resident asks to have taken out are withheld by name in data/records/withheld.json.
 */
const TITLED = /\b(Mr|Mrs|Ms|Miss|Mx|Dr)\.?\s+[A-Z]/;
/** "Applicant" then a name: a capital, then lower case, as found in a description's own words. */
const APPLICANT = /\b[Aa]pplicant\s*:?\s+[A-Z][a-z]/;

/** Whether words name a person: a title before a name, or an applicant named. */
export const namesAPerson = (words: string) => TITLED.test(words) || APPLICANT.test(words);

const PREMISES_KEYS = ['shop', 'office', 'craft', 'amenity', 'healthcare', 'tourism', 'industrial'];
const PREMISES_BUILDINGS = new Set([
	'commercial',
	'retail',
	'office',
	'industrial',
	'warehouse',
	'supermarket',
	'kiosk'
]);

/** Whether the map has a thing as premises, not as a home. */
export const isPremises = (tags: Record<string, string> = {}) =>
	PREMISES_KEYS.some((k) => tags[k]) || PREMISES_BUILDINGS.has(tags.building ?? '');

/** Whether a record is left out as concerning a person, given the source and what the map has there. */
export function concernsAPerson(
	prefix: string,
	record: SourceRecord,
	thing?: { tags?: Record<string, string> }
): boolean {
	if (prefix === 'planning') return namesAPerson(record.claims.application ?? '');
	if (prefix === 'company') return !thing || !isPremises(thing.tags);
	return false;
}
