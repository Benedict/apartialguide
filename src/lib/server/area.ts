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
	elements: { lat?: number; lon?: number; tags?: Record<string, string> }[];
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
