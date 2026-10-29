import type { SourceRecord } from '../../core/adapters/records';
import { inBox } from './box';

interface Photo {
	id?: number | string;
	guid?: string;
	title?: string;
	lat?: number | string;
	long?: number | string;
	lon?: number | string;
	taken?: string;
	imagetaken?: string;
	imageTaken?: string;
}

/** The patch a photograph stands for, one per patch, the latest: about 100 m. */
const PATCH = 0.001;

/** Photographs from Geograph: the latest in each patch of about 100 m, its title as found, when taken. */
export function geographRecords(answer: { items?: Photo[] }, box: string): SourceRecord[] {
	const latest = new Map<string, SourceRecord>();
	for (const p of answer.items ?? []) {
		const lat = Number(p.lat);
		const lon = Number(p.long ?? p.lon);
		const title = p.title?.trim();
		const taken = (p.taken ?? p.imagetaken ?? p.imageTaken)?.slice(0, 10);
		if (!title || !taken || !/^\d{4}-\d{2}/.test(taken)) continue;
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBox([lat, lon], box)) continue;
		const key = `${Math.floor(lat / PATCH)}|${Math.floor(lon / PATCH)}`;
		if ((latest.get(key)?.observed ?? '') >= taken) continue;
		latest.set(key, {
			id: String(p.id ?? p.guid ?? key),
			at: [lat, lon],
			observed: taken,
			claims: { name: title, kind: 'photograph', taken: taken.slice(0, 7) }
		});
	}
	return [...latest.values()];
}
