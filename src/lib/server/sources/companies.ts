import type { SourceRecord } from '../../core/adapters/records';

/** How many names to keep for an address: the rest are counted. */
const NAMES = 3;

/** "02/05/2019" as "2019-05-02". */
const isoDay = (d = '') => {
	const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
};

/** A house number and street from the first address line that starts with a number. */
function numberAndStreet(row: Record<string, string>) {
	for (const line of [row['RegAddress.AddressLine1'], row['RegAddress.AddressLine2']]) {
		const m = line?.trim().match(/^(\d+[A-Za-z]?)[,\s]+(.+)$/);
		if (m) return { number: m[1], street: m[2].trim() };
	}
	return undefined;
}

/**
 * Companies on the register at addresses in the given postcodes, gathered by address: how many,
 * the first few names, oldest first, and when the oldest was incorporated. Names as found.
 */
export function companyRecords(
	rows: Record<string, string>[],
	postcodes: ReadonlySet<string>
): SourceRecord[] {
	const at = new Map<
		string,
		{ address: { number: string; street: string }; firms: { name: string; since?: string }[] }
	>();
	for (const row of rows) {
		if (!postcodes.has((row['RegAddress.PostCode'] ?? '').toUpperCase().trim())) continue;
		const address = numberAndStreet(row);
		if (!address || !row.CompanyName) continue;
		const key = `${address.number}|${address.street}`;
		const held = at.get(key) ?? { address, firms: [] };
		held.firms.push({ name: row.CompanyName.trim(), since: isoDay(row.IncorporationDate) });
		at.set(key, held);
	}
	return [...at].map(([id, { address, firms }]) => {
		firms.sort((a, b) => (a.since ?? '9999').localeCompare(b.since ?? '9999'));
		return {
			id,
			address,
			claims: {
				count: String(firms.length),
				names: firms
					.slice(0, NAMES)
					.map((f) => f.name)
					.join('|'),
				...(firms[0].since ? { since: firms[0].since } : {})
			}
		};
	});
}
