/**
 * WallCAP's own tables (the WallGIS database, at the Archaeology Data Service): each milecastle's
 * account whole, where Digital Britannia's copy is cut at 254 characters, and its longer history,
 * its paragraphs as written, references within them as found.
 */
export type Account = { account?: string; history?: string[] };

type Row = Record<string, string>;

export function wallcapAccounts(milecastles: Row[], core: Row[]): Record<number, Account> {
	const byRecord = new Map(core.map((r) => [r.CD_UID, r]));
	const accounts: Record<number, Account> = {};
	for (const m of milecastles) {
		const n = Number(m.MC_Number);
		const r = byRecord.get(m.MC_UID);
		if (!r || !Number.isFinite(n)) continue;
		const account = r.CD_Condition_Description?.trim() || undefined;
		const history = (r.CD_Summary ?? '')
			.split(/\n\s*\n|\r\n\s*\r\n/)
			.map((p) => p.replace(/\s+/g, ' ').trim())
			.filter(Boolean);
		if (account || history.length)
			accounts[n] = { ...(account ? { account } : {}), ...(history.length ? { history } : {}) };
	}
	return accounts;
}
