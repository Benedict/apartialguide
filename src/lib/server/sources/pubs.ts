import type { SourceRecord } from '../../core/adapters/records';
import { distance, type LatLon } from '../../core/geo';
import { inBox } from './box';

/** An element as Overpass or a snapshot gives it: a node's place, or a way's centre or nodes. */
export interface MapElement {
	type: string;
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	nodes?: number[];
	tags?: Record<string, string>;
}

/** The map's pubs as they stood on a date. */
export interface PastMap {
	asOf: string;
	elements: MapElement[];
}

/** How near a pub the map has now must be, with the same name, to be the same pub, in metres. */
export const SAME_PUB_WITHIN = 40;

/** Pubs and bars as the map has them now, and those it marks as closed: none of them is lost. */
const KNOWN = (t: Record<string, string>) =>
	['pub', 'bar'].includes(t.amenity) ||
	['disused:amenity', 'was:amenity', 'amenity:disused'].some(
		(k) => t[k] === 'pub' || t[k] === 'bar'
	);

function placeOf(e: MapElement, nodes: Map<number, LatLon>): LatLon | undefined {
	if (e.lat !== undefined && e.lon !== undefined) return [e.lat, e.lon];
	if (e.center) return [e.center.lat, e.center.lon];
	const points = (e.nodes ?? []).map((n) => nodes.get(n)).filter((p): p is LatLon => !!p);
	if (!points.length) return undefined;
	return [
		points.reduce((s, p) => s + p[0], 0) / points.length,
		points.reduce((s, p) => s + p[1], 0) / points.length
	];
}

/**
 * The named pubs the map had on one past date or more and has no longer: no pub, bar or closed pub
 * of the same name within 40 m now. Each keeps its name as found, where the map last put it, and the
 * first and last years a past map had it.
 */
export function lostPubs(
	pasts: readonly PastMap[],
	current: readonly MapElement[],
	bbox: string
): SourceRecord[] {
	const nodes = new Map<number, LatLon>();
	for (const e of current)
		if (e.type === 'node' && e.lat !== undefined) nodes.set(e.id, [e.lat, e.lon!]);
	const now = current.flatMap((e) => {
		if (!e.tags?.name || !KNOWN(e.tags)) return [];
		const at = placeOf(e, nodes);
		return at ? [{ name: e.tags.name.toLowerCase(), at }] : [];
	});
	const seen = new Map<string, { name: string; at: LatLon; first: string; last: string }>();
	for (const past of [...pasts].sort((a, b) => a.asOf.localeCompare(b.asOf))) {
		for (const e of past.elements) {
			const name = e.tags?.name;
			if (e.tags?.amenity !== 'pub' || !name) continue;
			const at = placeOf(e, new Map());
			if (!at || !inBox(at, bbox)) continue;
			const id = `${e.type}/${e.id}`;
			const was = seen.get(id);
			seen.set(id, { name, at, first: was?.first ?? past.asOf, last: past.asOf });
		}
	}
	return [...seen.entries()]
		.filter(
			([, p]) =>
				!now.some((n) => n.name === p.name.toLowerCase() && distance(n.at, p.at) <= SAME_PUB_WITHIN)
		)
		.map(([id, p]) => ({
			id,
			at: p.at,
			observed: p.last,
			claims: { name: p.name, kind: 'pub', first: p.first.slice(0, 4), last: p.last.slice(0, 4) }
		}));
}
