import { distance } from '../core/geo';

/** Overpass's answer to `out tags bb` for boundary relations. */
export interface BoundaryAnswer {
	elements: {
		tags?: Record<string, string>;
		bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
	}[];
}

/** The box around every boundary matched, as the snapshot script takes it, and their names. */
export function bboxAroundBoundaries(answer: BoundaryAnswer): { bbox: string; names: string[] } {
	const found = answer.elements.filter((e) => e.bounds);
	if (!found.length) throw new Error('Overpass found no boundary by that name');
	const all = found.map((e) => e.bounds!);
	const box = [
		Math.min(...all.map((b) => b.minlon)),
		Math.min(...all.map((b) => b.minlat)),
		Math.max(...all.map((b) => b.maxlon)),
		Math.max(...all.map((b) => b.maxlat))
	];
	return {
		bbox: box.map((v) => v.toFixed(6)).join(','),
		names: found.map((e) => e.tags?.name ?? '(unnamed)')
	};
}

/** Overpass's answer for place nodes of a name. */
export interface PlaceAnswer {
	elements: { type?: string; lat?: number; lon?: number; tags?: Record<string, string> }[];
}

/** Places of the kind that name a district, most district-like first. */
const KINDS = ['suburb', 'quarter', 'neighbourhood', 'town', 'village', 'locality'];

/** The point the map gives a place: a suburb's before any lesser place of the same name. */
export function placeCentre(answer: PlaceAnswer): [number, number] {
	const places = answer.elements.filter((e) => e.lat !== undefined && e.tags?.place);
	if (!places.length) throw new Error('Overpass found no place by that name');
	const rank = (e: PlaceAnswer['elements'][number]) => {
		const i = KINDS.indexOf(e.tags!.place);
		return i === -1 ? KINDS.length : i;
	};
	const [best] = [...places].sort((a, b) => rank(a) - rank(b));
	return [best.lat!, best.lon!];
}

/** A box cut into tiles no wider or taller than `metres`, west to east within south to north. */
export function tiles(bbox: string, metres: number): string[] {
	const [w, s, e, n] = bbox.split(',').map(Number);
	const cols = Math.ceil(distance([s, w], [s, e]) / metres);
	const rows = Math.ceil(distance([s, w], [n, w]) / metres);
	const out: string[] = [];
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++)
			out.push(
				[
					w + ((e - w) * c) / cols,
					s + ((n - s) * r) / rows,
					w + ((e - w) * (c + 1)) / cols,
					s + ((n - s) * (r + 1)) / rows
				]
					.map((v) => v.toFixed(6))
					.join(',')
			);
	return out;
}

/** Elements from several tiles, each once: a way crossing a tile edge comes in both. */
export function mergeElements<T extends { type: string; id: number }>(lists: T[][]): T[] {
	const seen = new Map<string, T>();
	for (const list of lists)
		for (const e of list) if (!seen.has(`${e.type}/${e.id}`)) seen.set(`${e.type}/${e.id}`, e);
	return [...seen.values()];
}

/** Answers that mean the server is busy, not that the question is wrong. */
const BUSY = new Set([429, 502, 503, 504]);

/**
 * Asks, and while the server answers that it is busy, asks again after each wait in turn (in
 * seconds), as Overpass asks of those who use it: the last answer, busy or not, is returned.
 */
export async function politely<T extends { status: number }>(
	ask: () => Promise<T>,
	waits: number[],
	sleep: (seconds: number) => Promise<void>
): Promise<T> {
	let res = await ask();
	for (const wait of waits) {
		if (!BUSY.has(res.status)) return res;
		await sleep(wait);
		res = await ask();
	}
	return res;
}
