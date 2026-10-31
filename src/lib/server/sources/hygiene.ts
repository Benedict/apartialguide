import type { SourceRecord } from '../../core/adapters/records';
import { inBox, point, said } from './box';

/** One establishment, as the FSA's ratings API answers. */
export interface Establishment {
	FHRSID: number;
	BusinessName?: string;
	BusinessType?: string;
	RatingValue?: string;
	RatingDate?: string | null;
	geocode?: { longitude?: string | null; latitude?: string | null };
}

const DAY = /^\d{4}-\d{2}-\d{2}/;
/** The date the FSA gives an establishment it has not yet rated: a placeholder, not a day. */
const NO_DATE = '1901-01-01';

/** The FSA's establishments in the box, as records linked by the FHRS id the map may carry. */
export function hygieneRecords(
	answer: { establishments?: Establishment[] },
	bbox: string
): SourceRecord[] {
	const records: SourceRecord[] = [];
	for (const e of answer.establishments ?? []) {
		const at = point(e.geocode?.latitude, e.geocode?.longitude);
		if (at && !inBox(at, bbox)) continue;
		const day = e.RatingDate && DAY.test(e.RatingDate) ? e.RatingDate.slice(0, 10) : undefined;
		const date = day === NO_DATE ? undefined : day;
		records.push({
			id: String(e.FHRSID),
			link: { key: 'fhrs:id', value: String(e.FHRSID) },
			...(at ? { at } : {}),
			...(date ? { observed: date } : {}),
			claims: said({ name: e.BusinessName, kind: e.BusinessType, rating: e.RatingValue, date })
		});
	}
	return records;
}
