import type { SourceRecord } from '../../core/adapters/records';
import type { LatLon } from '../../core/geo';
import { inBox, point, said } from './box';
import { stripNames } from '../../core/adapters/personal';

const DAY = /^(\d{4})-(\d{2})-(\d{2})/;
const UK_DAY = /^(\d{2})\/(\d{2})\/(\d{4})/;

/** A date as YYYY-MM-DD, written either way round; nothing if it is neither. */
function day(value: unknown): string | undefined {
	const s = String(value ?? '');
	const iso = DAY.exec(s);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
	const uk = UK_DAY.exec(s);
	return uk ? `${uk[3]}-${uk[2]}-${uk[1]}` : undefined;
}

/** "POINT (lon lat)", as planning.data.gov.uk gives a place. */
function wktPoint(value: unknown): LatLon | undefined {
	const m = /POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(String(value ?? ''));
	return m ? [Number(m[2]), Number(m[1])] : undefined;
}

/** Whatever of these shapes a place comes in: {lat, lon}, "lat,lon", or [lon, lat]. */
function anyPoint(value: unknown): LatLon | undefined {
	if (Array.isArray(value)) return point(value[1], value[0]);
	if (typeof value === 'string') {
		const [lat, lon] = value.split(',');
		return point(lat, lon);
	}
	const v = value as { lat?: unknown; lon?: unknown } | undefined;
	return v ? point(v.lat, v.lon) : undefined;
}

/** Listed buildings and protected trees, from planning.data.gov.uk's entities. */
export function protectedRecords(
	answer: { entities?: Record<string, unknown>[] },
	bbox: string
): SourceRecord[] {
	const records: SourceRecord[] = [];
	for (const e of answer.entities ?? []) {
		const at = wktPoint(e.point);
		if (!at || !inBox(at, bbox)) continue;
		const listed = day(e['start-date']);
		const tree = e.dataset === 'tree';
		const name = tree ? (e['tree-species'] ?? e.name) : e.name;
		records.push({
			id: String(e.entity),
			at,
			...(listed ? { observed: listed } : {}),
			claims: tree
				? said({ name, description: 'protected tree', species: e['tree-species'] })
				: said({ name, description: 'listed building', grade: e['listed-building-grade'], listed })
		});
	}
	return records;
}

/**
 * Planning applications from the London Planning Datahub: the latest at each address. Only the
 * reference, address, description, decision and dates are kept, never an applicant or agent, and a
 * name in the description is taken out (`stripNames`), each time logged by reference alone.
 */
export function planningRecords(
	answer: { hits?: { hits?: { _id: string; _source: Record<string, unknown> }[] } },
	bbox: string,
	log: (line: string) => void = console.warn
): SourceRecord[] {
	const latest = new Map<string, SourceRecord>();
	for (const { _id, _source: a } of answer.hits?.hits ?? []) {
		const at = anyPoint(a.centroid ?? a.location);
		if (at && !inBox(at, bbox)) continue;
		const date = day(a.decision_date) ?? day(a.valid_date);
		const number = a.site_number ? String(a.site_number) : undefined;
		const street = a.street_name ? String(a.street_name) : undefined;
		const id = String(a.lpa_app_no ?? a.id ?? _id);
		const description = typeof a.description === 'string' ? a.description : undefined;
		const stripped = description ? stripNames(description) : undefined;
		// The reference alone is logged, so a public log names no one; look it up to check the cut.
		if (stripped?.removed)
			log(`planning ${id}: took ${stripped.removed} name(s) out of the description`);
		const record: SourceRecord = {
			id,
			...(number && street ? { address: { number, street } } : {}),
			...(at ? { at } : {}),
			...(date ? { observed: date } : {}),
			claims: said({ application: stripped?.text, decision: a.decision, date })
		};
		const key = number && street ? `${number}|${street}`.toLowerCase() : record.id;
		const before = latest.get(key);
		if (!before || (record.observed ?? '') > (before.observed ?? '')) latest.set(key, record);
	}
	return [...latest.values()];
}

/** Plaques from Open Plaques, by their inscription. */
export function plaqueRecords(answer: unknown, bbox: string): SourceRecord[] {
	const list = (
		Array.isArray(answer) ? answer : ((answer as { plaques?: unknown[] })?.plaques ?? [])
	) as Record<string, unknown>[];
	const records: SourceRecord[] = [];
	for (const p of list) {
		const at = point(p.latitude, p.longitude);
		if (!at || !inBox(at, bbox) || !p.inscription) continue;
		const erected = day(p.erected_at);
		records.push({
			id: String(p.id),
			at,
			...(erected ? { observed: erected } : {}),
			claims: said({
				name: p.inscription,
				description: 'plaque',
				inscription: p.inscription,
				erected
			})
		});
	}
	return records;
}

/** The fewest sales in the period for a street's range to be told: fewer, and one might be known. */
export const FEWEST_SALES = 5;
/** Each end of a street's range is rounded to the nearest this many pounds. */
export const ROUND_TO = 25_000;
/** How many years before the records were taken the period begins. */
export const SALES_YEARS = 6;

/**
 * Sales from the Land Registry's Price Paid data, kept only as each street's range: no sale at an
 * address, no house number and no price as paid. A street is told only where it had at least five
 * sales since the period began (six years before the records were taken, from 1 January), the
 * lowest and highest each rounded to the nearest £25,000.
 */
export function priceRecords(
	answer: { results?: { bindings?: Record<string, { value: string } | undefined>[] } },
	retrieved: string
): SourceRecord[] {
	const since = String(Number(retrieved.slice(0, 4)) - SALES_YEARS);
	const byStreet = new Map<string, { amounts: number[]; latest: string }>();
	for (const b of answer.results?.bindings ?? []) {
		const street = b.street?.value;
		const date = day(b.date?.value);
		const amount = Number(b.amount?.value);
		if (!street || !date || !Number.isFinite(amount) || amount <= 0 || date < `${since}-01-01`)
			continue;
		const entry = byStreet.get(street) ?? { amounts: [], latest: '' };
		entry.amounts.push(amount);
		if (date > entry.latest) entry.latest = date;
		byStreet.set(street, entry);
	}
	const rounded = (n: number) => String(Math.round(n / ROUND_TO) * ROUND_TO);
	return [...byStreet]
		.filter(([, { amounts }]) => amounts.length >= FEWEST_SALES)
		.map(([street, { amounts, latest }]) => ({
			id: street,
			street,
			observed: latest,
			claims: {
				since,
				sales: String(amounts.length),
				low: rounded(Math.min(...amounts)),
				high: rounded(Math.max(...amounts))
			}
		}));
}

/** Street-level crime from police.uk: each month's reports on or near each street, counted by kind. */
export function crimeRecords(
	crimes: { category?: string; month?: string; location?: { street?: { name?: string } } }[]
): SourceRecord[] {
	const byStreet = new Map<string, { street: string; month: string; kinds: Map<string, number> }>();
	for (const c of crimes) {
		const street = c.location?.street?.name?.replace(/^On or near /i, '').trim();
		if (!street || !c.month || !c.category) continue;
		const key = `${street}|${c.month}`;
		const entry = byStreet.get(key) ?? { street, month: c.month, kinds: new Map<string, number>() };
		// police.uk's slugs, in words; anti-social keeps its own hyphen.
		const kind = c.category.replace(/-/g, ' ').replace(/\banti social\b/, 'anti-social');
		entry.kinds.set(kind, (entry.kinds.get(kind) ?? 0) + 1);
		byStreet.set(key, entry);
	}
	return [...byStreet].map(([id, { street, month, kinds }]) => {
		const counted = [...kinds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
		return {
			id,
			street,
			observed: `${month}-01`,
			claims: {
				month,
				reports: String(counted.reduce((n, [, k]) => n + k, 0)),
				kinds: counted.map(([kind, k]) => `${kind} (${k})`).join(', ')
			}
		};
	});
}
