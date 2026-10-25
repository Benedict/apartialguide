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
