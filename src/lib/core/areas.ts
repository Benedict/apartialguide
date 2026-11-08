import { insideRing, type LatLon } from './geo';

/** An area another source draws, such as a ward: its name and kind as the source gives them. */
export interface AreaRecord {
	id: string;
	name: string;
	kind: string;
	/** Its outer rings, one per part. */
	rings: LatLon[][];
	/** Holes in it, where another area lies instead (a rock's outcrop of another rock). */
	holes?: LatLon[][];
	/** What the account says of it, every value as found. */
	claims?: Record<string, string>;
}

/** The first of the areas that the point lies in, if any. */
export function areaAt(p: LatLon, areas: readonly AreaRecord[]): AreaRecord | undefined {
	return areas.find((a) => a.rings.some((ring) => insideRing(p, ring)));
}
