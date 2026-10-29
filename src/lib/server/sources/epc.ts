import type { SourceRecord } from '../../core/adapters/records';
import { houseAndStreet } from './address';

/**
 * Energy performance certificates, the latest for each address: when the house was built (the
 * certificate's age band, without the nation it prefixes), its energy rating, and when it was lodged.
 */
export function epcRecords(rows: Record<string, string>[]): SourceRecord[] {
	const latest = new Map<string, SourceRecord>();
	for (const row of rows) {
		const address = houseAndStreet([row.address1, row.address2, row.address3]);
		const lodged = row['lodgement-date']?.slice(0, 10);
		if (!address || !lodged) continue;
		const id = `${address.number}|${address.street}`;
		if ((latest.get(id)?.observed ?? '') >= lodged) continue;
		const band = row['construction-age-band']?.replace(/^England and Wales:\s*/i, '').trim();
		const built = band && /\d|before|onwards/i.test(band) ? band : undefined;
		const rating = row['current-energy-rating']?.trim();
		latest.set(id, {
			id,
			address,
			observed: lodged,
			claims: { ...(built ? { built } : {}), ...(rating ? { rating } : {}), lodged }
		});
	}
	return [...latest.values()];
}
