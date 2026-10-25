import type { SourceRecord } from '../../core/adapters/records';
import { distanceToPolyline, type LatLon } from '../../core/geo';
import { inBox } from './box';

/** Rows of a CSV file as objects keyed by its header. Quoted fields may hold commas and quotes. */
export function parseCsv(text: string): Record<string, string>[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	const endRow = () => {
		row.push(field);
		rows.push(row);
		row = [];
		field = '';
	};
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			endRow();
		} else field += c;
	}
	if (field || row.length) rows.push([...row, field]);
	const [header, ...body] = rows;
	return body
		.filter((r) => r.some((v) => v !== ''))
		.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

const pick = (row: Record<string, string>, pattern: RegExp) =>
	Object.entries(row)
		.find(([k, v]) => pattern.test(k) && v.trim())?.[1]
		.trim();

/** How near a street a tree must stand to be counted as that street's, in metres. */
const ALONG = 25;

/**
 * Trees as their borough lists them, counted by the named street each stands nearest, within
 * 25 m: names as found (common name, else species), most first.
 */
export function treeRecords(
	rows: Record<string, string>[],
	box: string,
	streets: { name: string; line: LatLon[] }[]
): SourceRecord[] {
	const byStreet = new Map<string, Map<string, number>>();
	for (const row of rows) {
		const lat = Number(pick(row, /^lat(itude)?$/i));
		const lon = Number(pick(row, /^(lon|long|longitude|lng)$/i));
		const kind = pick(row, /common.?name/i) ?? pick(row, /species|taxon|botanical/i);
		if (!kind || !Number.isFinite(lat) || !Number.isFinite(lon) || !inBox([lat, lon], box))
			continue;
		let best: { name: string; d: number } | undefined;
		for (const s of streets) {
			const d = distanceToPolyline([lat, lon], s.line);
			if (d <= ALONG && (!best || d < best.d)) best = { name: s.name, d };
		}
		if (!best) continue;
		const kinds = byStreet.get(best.name) ?? new Map<string, number>();
		kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
		byStreet.set(best.name, kinds);
	}
	return [...byStreet].map(([street, kinds]) => {
		const counted = [...kinds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
		return {
			id: `trees:${street}`,
			street,
			claims: {
				count: String(counted.reduce((n, [, k]) => n + k, 0)),
				kinds: counted.map(([kind, k]) => `${kind} (${k})`).join(', ')
			}
		};
	});
}
