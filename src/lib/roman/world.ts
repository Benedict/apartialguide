import { distance, type LatLon } from '../core/geo';
import type { AdventureWorld, CompiledExit, CompiledStop } from '../core/adventure/world';

/**
 * A spike: Digital Britannia's Roman roads and sites as a walk of their own, site to site. Each place
 * is a site within reach of a road or the Wall (a fork on the road is passed, never stopped at); each
 * way is a stage to the next site, told by where it goes, how far, and what changes on it: the road,
 * its confidence in the layer's own words, the county. Every word of a place is the data's, as found:
 * names, kinds, ages, inscriptions, a milecastle's account, cut short where the data cuts it.
 */

type Props = Record<string, unknown>;
type Feature = { properties: Props; geometry: { type: string; coordinates: unknown } | null };
export type RomanLayers = Partial<
	Record<
		'roads' | 'walls' | 'settlement' | 'military' | 'camps' | 'milestones' | 'milecastles',
		{ features: Feature[] }
	>
>;

/** How near a site must lie to a road to be stopped at, and how near two stops are one. */
const SITE_REACH = 2000;
const SAME_STOP = 1000;
const JUNCTION = 300;
/** The longest stage told, past forks and road ends, before the way is given up. */
const STAGE_MAX = 60_000;

const text = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined);

type Site = { layer: keyof RomanLayers; name: string; props: Props; at: LatLon };
type Node = { at: LatLon; sites: Site[] };
type Road = { name: string; also?: string; confidence?: string; points: LatLon[] };

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

/** A site's name as kept; a milecastle by its number and its name. */
function nameOf(layer: string, p: Props): string | undefined {
	if (layer !== 'milecastles') return text(p[NAME_KEY[layer]]);
	const n = text(p['MC_No.']);
	const name = text(p.Site_name);
	return n ? `Milecastle ${n}${name ? `, ${name}` : ''}` : name;
}

/** A length as a walker would say it: to a tenth of a kilometre under ten, whole above. */
const km = (metres: number) =>
	metres >= 10_000 ? `${Math.round(metres / 1000)} km` : `${(metres / 1000).toFixed(1)} km`;

const county = (n: { sites: Site[] }) =>
	n.sites.map((x) => text(x.props['Historic County'])).find(Boolean);

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
	if (s.layer === 'milecastles') {
		said.push(`${s.name}: a milecastle.`);
		const kept = (['Status', 'Condition', 'Type', 'Gate_Type'] as const)
			.map((k) => [k.replace('_', ' '), text(p[k])])
			.filter(([, v]) => v)
			.map(([k, v]) => `${k}: ${v}`);
		if (kept.length) said.push(`${kept.join('; ')}.`);
		const account = text(p.Account);
		if (account) said.push(`Someone wrote: “${account}”.`);
		const found = text(p.Artefacts);
		if (found) said.push(`Found there: ${found}.`);
	}
	if (roman) said.push(`It is said it was called “${roman}”.`);
	return said;
}

export function romanWorld(
	layers: RomanLayers,
	{ confidence, start }: { confidence: Record<string, string>; start: string }
): AdventureWorld {
	const wallLines = (layers.walls?.features ?? []).filter(
		(f) => !/ditch|vallum/i.test(String(f.properties.Feature ?? ''))
	);
	const roads: Road[] = [...(layers.roads?.features ?? []), ...wallLines].flatMap((f) =>
		lines(f.geometry)
			.filter((l) => l.length > 1)
			.map((points) => ({
				name:
					text(f.properties['Road - Start and End']) ??
					text(f.properties['Road name (if any)']) ??
					text(f.properties.Feature) ??
					'A road',
				also: text(f.properties['Road name (if any)']),
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
	for (const layer of ['settlement', 'military', 'camps', 'milestones', 'milecastles'] as const)
		for (const f of layers[layer]?.features ?? []) {
			const at = pointOf(f.geometry);
			const name = nameOf(layer, f.properties);
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

	// The stages: from each site along the ways, past forks and road ends, to the next sites.
	type Leg = { road: Road; metres: number };
	type Stage = { to: number; legs: Leg[]; metres: number };
	const stagesFrom = (from: number): Stage[] => {
		const best = new Map<number, Stage>();
		const go = (here: number, legs: Leg[], metres: number, seen: Set<number>) => {
			for (const w of ways[here]) {
				if (seen.has(w.to) || metres + w.metres > STAGE_MAX) continue;
				const next = [...legs, { road: w.road, metres: w.metres }];
				if (nodes[w.to].sites.length) {
					const had = best.get(w.to);
					if (!had || had.metres > metres + w.metres)
						best.set(w.to, { to: w.to, legs: next, metres: metres + w.metres });
				} else go(w.to, next, metres + w.metres, new Set([...seen, w.to]));
			}
		};
		go(from, [], 0, new Set([from]));
		return [...best.values()];
	};

	/** A stage's legs, one road and confidence at a time, as they change on the way. */
	const told = (legs: Leg[]): string => {
		const runs: { name: string; also?: string; confidence?: string; metres: number }[] = [];
		for (const { road, metres } of legs) {
			const last = runs.at(-1);
			if (last && last.name === road.name && last.confidence === road.confidence)
				last.metres += metres;
			else runs.push({ name: road.name, also: road.also, confidence: road.confidence, metres });
		}
		return runs
			.map((r, k) => {
				const sure = r.confidence ? `${r.confidence} for ${km(r.metres)}` : '';
				const named = k === 0 || runs[k - 1].name !== r.name;
				// The road's own name too, where it keeps one its start and end do not already say.
				const also = r.also && !r.name.includes(r.also) ? ` (“${r.also}”)` : '';
				const said = named ? `“${r.name}”${also}${sure ? `, ${sure}` : ''}` : sure;
				return k === 0 ? said : named ? `; then ${said}` : `, then ${said}`;
			})
			.join('');
	};

	const sites = nodes.map((n, i) => (n.sites.length ? i : -1)).filter((i) => i >= 0);
	const id = (i: number) => `r${i}`;
	const stops: Record<string, CompiledStop> = {};
	for (const i of sites) {
		const n = nodes[i];
		const exits: CompiledExit[] = [];
		const said: string[] = [];
		const taken = new Set<string>();
		for (const st of stagesFrom(i).sort((x, y) => x.metres - y.metres)) {
			const to = nodes[st.to];
			const b = bearing(n.at, to.at);
			const label = POINTS.map((p, k) => ({
				p,
				off: Math.abs(((((b - k * 45) % 360) + 540) % 360) - 180)
			}))
				.sort((x, y) => x.off - y.off)
				.map((x) => x.p)
				.find((p) => !taken.has(p));
			if (!label) continue;
			taken.add(label);
			exits.push({ label, to: id(st.to), street: st.legs[0].road.name });
			const into =
				county(to) && county(n) && county(to) !== county(n) ? `, into ${county(to)}` : '';
			said.push(`${label}, ${km(st.metres)} to ${to.sites[0].name}${into}: ${told(st.legs)}`);
		}
		// Each thing said once, though two sites here keep it: a name, as found, once.
		const lines = [...new Set(n.sites.flatMap(siteLines))];
		const names = new Set(n.sites.map((x) => x.name));
		const waysLine = said.length ? `Ways: ${said.join(' · ')}.` : undefined;
		stops[id(i)] = {
			title: n.sites[0].name,
			paragraphs: [lines.join(' '), ...(waysLine ? [waysLine] : [])],
			// A site's name is always said; what is kept of it, by its words, is not said again if it
			// was heard at the last two places, as on the borough's walk.
			parts: [
				lines.map((text) => ({
					kind: [...names].some((name) => text.startsWith(`${name}: `))
						? ('prose' as const)
						: ('setting' as const),
					text,
					key: text
				})),
				...(waysLine ? [[{ kind: 'exits' as const, text: waysLine, key: 'exits' }]] : [])
			],
			exits,
			things: [],
			at: [+n.at[0].toFixed(5), +n.at[1].toFixed(5)]
		};
	}
	const first = sites.find((i) => nodes[i].sites.some((x) => x.name === start)) ?? sites[0];
	return { start: id(first), stops, ways: 'Ways' };
}
