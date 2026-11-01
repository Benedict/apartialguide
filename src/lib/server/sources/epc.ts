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

/**
 * The rows of one answer from the register's new search (get-energy-performance-data), in the names
 * `epcRecords` reads: its address lines, its energy band, and when it was registered. The search gives
 * no construction age band, so a house's age is not said.
 */
export function epcFromSearch(answer: {
	data?: unknown;
	pagination?: unknown;
}): Record<string, string>[] {
	const data = answer.data as unknown;
	const rows = (
		Array.isArray(data)
			? data
			: ((data as { certificates?: unknown[] } | undefined)?.certificates ?? [])
	) as Record<string, unknown>[];
	const s = (v: unknown) => (v == null ? '' : String(v));
	return rows.map((r) => ({
		address1: s(r.addressLine1),
		address2: s(r.addressLine2),
		address3: s(r.addressLine3),
		postcode: s(r.postcode),
		'current-energy-rating': s(r.currentEnergyEfficiencyBand),
		'lodgement-date': s(r.registrationDate)
	}));
}
