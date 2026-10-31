import { distance, type LatLon } from '../geo';
import type { OsmData } from '../osm';
import type { StopId } from '../stops';

/** How far a postcode's addresses may lie from the nearest place, and it still be given that place. */
const NEAR_ENOUGH = 300;

/** A UK postcode however it is typed, written as the Post Office writes it: "CR0 7HE". */
export function postcodeOf(text: string): string | undefined {
	const m = text
		.trim()
		.toUpperCase()
		.replace(/\s+/g, '')
		.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
	return m ? `${m[1]} ${m[2]}` : undefined;
}

/**
 * The postcodes the map's own addresses carry, each given the place nearest the middle of its
 * addresses, if near enough: so a reader may begin at a postcode from the page alone, asking no one.
 */
export function postcodesFrom(
	data: OsmData,
	stops: Record<StopId, { at?: LatLon }>
): Record<string, StopId> {
	const nodes = new Map<number, LatLon>();
	for (const e of data.elements) if (e.type === 'node') nodes.set(e.id, [e.lat, e.lon]);
	const sums = new Map<string, { lat: number; lon: number; n: number }>();
	for (const e of data.elements) {
		const code = e.tags?.['addr:postcode'] && postcodeOf(e.tags['addr:postcode']);
		if (!code) continue;
		const points: LatLon[] =
			e.type === 'node'
				? [[e.lat, e.lon]]
				: e.type === 'way'
					? e.nodes.flatMap((id) => (nodes.has(id) ? [nodes.get(id)!] : []))
					: [];
		const sum = sums.get(code) ?? { lat: 0, lon: 0, n: 0 };
		for (const [lat, lon] of points) {
			sum.lat += lat;
			sum.lon += lon;
			sum.n++;
		}
		sums.set(code, sum);
	}
	const placed = Object.entries(stops).flatMap(([id, s]) => (s.at ? [[id, s.at] as const] : []));
	const found: Record<string, StopId> = {};
	for (const [code, { lat, lon, n }] of [...sums].sort(([a], [b]) => a.localeCompare(b))) {
		if (!n) continue;
		const middle: LatLon = [lat / n, lon / n];
		let best: [StopId, number] | undefined;
		for (const [id, at] of placed) {
			const m = distance(middle, at);
			if (!best || m < best[1]) best = [id, m];
		}
		if (best && best[1] <= NEAR_ENOUGH) found[code] = best[0];
	}
	return found;
}
