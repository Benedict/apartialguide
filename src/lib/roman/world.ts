import { distance, type LatLon } from '../core/geo';
import type { AdventureWorld, CompiledExit, CompiledStop } from '../core/adventure/world';

/**
 * A spike: Digital Britannia's Roman roads and sites as a walk of their own. A stop where a road
 * ends, where roads meet, and at each site within reach of a road; each way along a road to the next
 * stop. Every word of a place is the data's, as found: names, kinds, ages, inscriptions, and each
 * road's confidence in the layer's own words.
 */

type Props = Record<string, unknown>;
type Feature = { properties: Props; geometry: { type: string; coordinates: unknown } | null };
export type RomanLayers = Partial<
	Record<'roads' | 'settlement' | 'military' | 'camps' | 'milestones', { features: Feature[] }>
>;

/** How near a site must lie to a road to be stopped at, and how near two stops are one. */
const SITE_REACH = 2000;
const SAME_STOP = 1000;
const JUNCTION = 300;

const text = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined);

type Site = { layer: keyof RomanLayers; name: string; props: Props; at: LatLon };
type Node = { at: LatLon; sites: Site[] };
type Road = { name: string; confidence?: string; points: LatLon[] };

const POINTS = [
	'north',
	'north-east',
	'east',
	'south-east',
	'south',
	'south-west',
	'west',
	'north-west'
];

function bearing([lat1, lon1]: LatLon, [lat2, lon2]: LatLon): number {
	const r = Math.PI / 180;
	const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
	const x =
		Math.cos(lat1 * r) * Math.sin(lat2 * r) -
		Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
	return (Math.atan2(y, x) / r + 360) % 360;
}

/** Every line in a geometry, as latitude and longitude. */
function lines(g: Feature['geometry']): LatLon[][] {
	if (!g) return [];
	const c = g.coordinates as number[][] | number[][][];
	const flip = (l: number[][]) => l.map(([lon, lat]) => [lat, lon] as LatLon);
	return g.type === 'MultiLineString' ? (c as number[][][]).map(flip) : [flip(c as number[][])];
}

const pointOf = (g: Feature['geometry']): LatLon | undefined => {
	if (!g) return undefined;
	let c = g.coordinates as unknown;
	while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
	const [lon, lat] = c as number[];
	return typeof lat === 'number' ? [lat, lon] : undefined;
};

const NAME_KEY: Record<string, string> = {
	settlement: 'SITE_NAME',
	military: 'Modern Name',
	camps: 'Site Name',
	milestones: 'Site name'
};

/** What a site is, as kept: its kind, the ages it is kept for, its Roman name, its words. */
function siteLines(s: Site): string[] {
	const p = s.props;
	const said: string[] = [];
	const roman = text(p['ROMAN NAME']) ?? text(p['Roman name (if known)']) ?? text(p['Roman Name']);
	if (s.layer === 'settlement') said.push(`${s.name}: ${text(p.TYPE) ?? 'a settlement'}.`);
	if (s.layer === 'military') {
		said.push(`${s.name}: ${text(p['Main site type']) ?? 'a military site'}.`);
		const ages = Object.entries(p)
			.filter(([k, v]) => k.startsWith('Type - ') && text(v))
			.map(([k, v]) => `${k.slice(7)}: ${text(v)}`);
		if (ages.length) said.push(`Kept by age: ${ages.join('; ')}.`);
	}
	if (s.layer === 'camps') said.push(`${s.name}: ${text(p['Camp type']) ?? 'a camp'}.`);
	if (s.layer === 'milestones') {
		said.push(`${s.name}: a milestone.`);
		const words = text(p.Inscription);
		if (words) said.push(`On it: “${words}”.`);
		const meant = text(p['Inscription Translation']);
		if (meant) said.push(`Someone wrote down that it means “${meant}”.`);
	}
	if (roman) said.push(`It is said it was called “${roman}”.`);
	return said;
}

export function romanWorld(
	layers: RomanLayers,
	{ confidence, start }: { confidence: Record<string, string>; start: string }
): AdventureWorld {
	const roads: Road[] = (layers.roads?.features ?? []).flatMap((f) =>
		lines(f.geometry)
			.filter((l) => l.length > 1)
			.map((points) => ({
				name:
					text(f.properties['Road - Start and End']) ??
					text(f.properties['Road name (if any)']) ??
					'A road',
				confidence: confidence[String(f.properties['Segment Confidence'] ?? '')],
				points
			}))
	);
	const nodes: Node[] = [];
	const nodeAt = (at: LatLon): number => {
		const i = nodes.findIndex((n) => distance(n.at, at) <= SAME_STOP);
		if (i >= 0) return i;
		nodes.push({ at, sites: [] });
		return nodes.length - 1;
	};
	const nearest = (road: Road, at: LatLon) => {
		let best = Infinity;
		let index = 0;
		road.points.forEach((p, i) => {
			const d = distance(p, at);
			if (d < best) [best, index] = [d, i];
		});
		return { d: best, index };
	};
	const marks = roads.map(() => new Map<number, number>());

	// The sites within reach of a road, first, so a road's end beside one is that site's stop.
	for (const layer of ['settlement', 'military', 'camps', 'milestones'] as const)
		for (const f of layers[layer]?.features ?? []) {
			const at = pointOf(f.geometry);
			const name = text(f.properties[NAME_KEY[layer]]);
			if (!at || !name) continue;
			const reach = roads.map((r) => nearest(r, at));
			if (!reach.some((r) => r.d <= SITE_REACH)) continue;
			const i = nodeAt(at);
			if (!nodes[i].sites.length) nodes[i].at = at;
			nodes[i].sites.push({ layer, name, props: f.properties, at });
			reach.forEach((r, ri) => r.d <= SITE_REACH && marks[ri].set(r.index, i));
		}
	// Each road's ends, and where an end meets another road along its length.
	roads.forEach((r, ri) => {
		for (const index of [0, r.points.length - 1]) {
			const i = nodeAt(r.points[index]);
			marks[ri].set(index, i);
			roads.forEach((other, oi) => {
				if (oi === ri) return;
				const n = nearest(other, nodes[i].at);
				if (n.d <= JUNCTION) marks[oi].set(n.index, i);
			});
		}
	});

	// The ways: along each road from one stop to the next.
	type Way = { to: number; road: Road; metres: number };
	const ways = nodes.map(() => [] as Way[]);
	roads.forEach((r, ri) => {
		const along = [...marks[ri].entries()].sort(([a], [b]) => a - b);
		for (let k = 1; k < along.length; k++) {
			const [ia, a] = along[k - 1];
			const [ib, b] = along[k];
			if (a === b) continue;
			let metres = 0;
			for (let v = ia + 1; v <= ib; v++) metres += distance(r.points[v - 1], r.points[v]);
			ways[a].push({ to: b, road: r, metres });
			ways[b].push({ to: a, road: r, metres });
		}
	});

	const id = (i: number) => `r${i}`;
	const stops: Record<string, CompiledStop> = {};
	nodes.forEach((n, i) => {
		const exits: CompiledExit[] = [];
		const told: string[] = [];
		const taken = new Set<string>();
		for (const w of ways[i].sort((x, y) => x.metres - y.metres)) {
			const b = bearing(n.at, nodes[w.to].at);
			const order = POINTS.map((p, k) => ({
				p,
				off: Math.abs(((((b - k * 45) % 360) + 540) % 360) - 180)
			}))
				.sort((x, y) => x.off - y.off)
				.map((x) => x.p);
			const label = order.find((p) => !taken.has(p));
			if (!label) continue;
			taken.add(label);
			exits.push({ label, to: id(w.to), street: w.road.name });
			told.push(`${label}, ${Math.round(w.metres / 1000)} km along “${w.road.name}”`);
		}
		const here = [...new Map(ways[i].map((w) => [w.road.name, w.road])).values()];
		const roadLines = here.map(
			(r) => `“${r.name}” runs here${r.confidence ? `: ${r.confidence}` : ''}.`
		);
		const title = n.sites[0]?.name ?? here[0]?.name ?? 'A road';
		stops[id(i)] = {
			title,
			paragraphs: [
				...(n.sites.length ? [n.sites.flatMap(siteLines).join(' ')] : []),
				...(roadLines.length ? [roadLines.join(' ')] : []),
				...(told.length ? [`Ways: ${told.join('; ')}.`] : [])
			],
			exits,
			things: [],
			at: [+n.at[0].toFixed(5), +n.at[1].toFixed(5)]
		};
	});
	const first = nodes.findIndex((n) => n.sites.some((s) => s.name === start));
	return { start: id(first < 0 ? 0 : first), stops, ways: 'Ways' };
}
