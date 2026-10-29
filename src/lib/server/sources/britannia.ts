import type { LatLon } from '../../core/geo';
import { distance } from '../../core/geo';

/** A layer of Digital Britannia as GeoJSON, in longitude and latitude. */
interface Layer {
	features?: {
		properties?: Record<string, unknown> | null;
		geometry?: { type: string; coordinates: unknown } | null;
	}[];
}

type Kept = { name: string; also?: string; kind: string; points: LatLon[] };

/** How far from the map's edge a Roman thing may lie and still be kept, in metres. */
const REACH = 10_000;

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Every position in a geometry, as latitude and longitude. */
function positions(geometry: { type: string; coordinates: unknown }): LatLon[] {
	const flat = (c: unknown): number[][] =>
		Array.isArray(c) && typeof c[0] === 'number' ? [c as number[]] : (c as unknown[]).flatMap(flat);
	return flat(geometry.coordinates).map(([lon, lat]) => [lat, lon]);
}

/**
 * The Roman roads, forts, camps, settlements and milestones of Digital Britannia that lie near the
 * map but outside it: their names and kinds as the RRRA keeps them, for when the reader looks beyond.
 */
export function britanniaBeyond(
	layers: Partial<Record<'roads' | 'settlement' | 'military' | 'camps' | 'milestones', Layer>>,
	box: string
): Kept[] {
	const [w, s, e, n] = box.split(',').map(Number);
	const centre: LatLon = [(s + n) / 2, (w + e) / 2];
	const reach = REACH + distance(centre, [n, e]);
	const near = (points: LatLon[]) => points.some((p) => distance(centre, p) <= reach);
	const kept: Kept[] = [];
	const keep = (
		layer: Layer | undefined,
		read: (p: Record<string, unknown>) => Omit<Kept, 'points'> | undefined
	) => {
		for (const f of layer?.features ?? []) {
			if (!f.geometry || !f.properties) continue;
			const said = read(f.properties);
			const points = positions(f.geometry);
			if (said?.name && points.length && near(points)) kept.push({ ...said, points });
		}
	};
	const named = (name: unknown, kind: string | undefined, also?: unknown) => {
		const n = text(name);
		if (!n || !kind) return undefined;
		const a = text(also);
		return { name: n, ...(a ? { also: a } : {}), kind };
	};
	keep(layers.roads, (p) => named(p['Road - Start and End'], 'a Roman road'));
	keep(layers.settlement, (p) => named(p.SITE_NAME, text(p.TYPE), p['ROMAN NAME']));
	keep(layers.military, (p) =>
		named(p['Modern Name'], text(p['Main site type']), p['Roman name (if known)'])
	);
	keep(layers.camps, (p) => named(p['Site Name'], text(p['Camp type'])));
	keep(layers.milestones, (p) => named(p['Site name'], 'a Roman milestone'));
	return kept;
}
