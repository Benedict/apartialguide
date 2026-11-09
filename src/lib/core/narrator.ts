import { isMineEntry } from './entries';
import { HistoryAdapter } from './adapters/history';
import { OsmAdapter } from './adapters/osm';
import { WikidataAdapter, type WikidataStore } from './adapters/wikidata';
import { RecordsAdapter, type RecordStore } from './adapters/records';
import { areaAt, type AreaRecord } from './areas';
import type { Beyond } from './render/beyond';
import { keeper } from './keepers';
import type { Clock, Fact } from './facts';
import {
	bearing,
	distance,
	distanceToPolyline,
	insideRing,
	nearestOnPolyline,
	type LatLon
} from './geo';
import { boxOf, Grid } from './grid';
import { OsmIndex, type OsmData, type Tags } from './osm';
import { Perception } from './perception';
import { AdventureRenderer, WAY_IN } from './render/adventure';
import type { Renderer, Room } from './render/renderer';
import { buildScene, type Scene } from './scene';
import { chooseSlippage, isBackground, type NarrationPlan } from './slippage';
import { buildStopGraph, type Exit, type Stop, type StopGraph, type StopId } from './stops';
import { detectTensions, isElsewhere, type TensionOptions } from './tensions';

export interface NarratorOptions extends TensionOptions {
	clock: Clock;
	renderer?: Renderer;
	/** Largest gap between stops along a street, in metres. */
	spacing?: number;
	/** Earlier maps of the same place, for what has gone or been renamed. */
	history?: { asOf: string; data: OsmData }[];
	/** Another account of the place, from Wikidata. */
	wikidata?: WikidataStore;
	/** Other sources' records about the place: food hygiene, listed buildings, planning… */
	records?: RecordStore[];
}

export interface Visit {
	stop: Stop;
	inView: Fact[];
	plan: NarrationPlan;
	scene: Scene;
	room: Room;
	/** The room's paragraphs as one text. */
	text: string;
	exits: Exit[];
}

/** What the map and the other accounts hold, as a whole. */
export interface MapLedger {
	streets: number;
	oldest?: string;
	accounts: string[];
}

function ledgerOf(
	osm: OsmIndex,
	facts: readonly Fact[],
	records: readonly RecordStore[]
): MapLedger {
	const streets = new Set(
		osm.ways.filter((w) => w.tags?.highway && w.tags?.name).map((w) => w.tags!.name)
	).size;
	const oldest = facts
		.filter((f) => f.source === 'osm' && f.observed)
		.reduce<string | undefined>((a, f) => (!a || f.observed! < a ? f.observed : a), undefined);
	const accounts = [
		...new Set([
			...facts.filter(isElsewhere).map((f) => keeper(f.source)),
			...records.filter((r) => r.areas?.length).map((r) => keeper(r.source))
		])
	];
	return { streets, ...(oldest ? { oldest } : {}), accounts };
}

/** How far Guide looks for the nearest name, at a stop with none in view, in metres. */
const NEAREST_NAME_REACH = 400;

/** A named thing on the map, not a street, and where it lies: for the nearest name. */
export interface Named {
	subject: string;
	tags: Tags;
	geometry: LatLon[];
}

/** The map's own named things, other than streets, each with where it lies. */
function namedThings(facts: readonly Fact[]): Named[] {
	const bySubject = new Map<string, Fact[]>();
	for (const f of facts)
		if (!isElsewhere(f) && !f.claim.key.startsWith('was:'))
			bySubject.set(f.subject, [...(bySubject.get(f.subject) ?? []), f]);
	return [...bySubject].flatMap(([subject, fs]) => {
		const tags = Object.fromEntries(fs.map((f) => [f.claim.key, f.claim.value]));
		const geometry = fs.find((f) => f.geometry.length)?.geometry;
		// A way into a mine is never the nearest name: that would say which way it lies.
		return tags.name && !tags.highway && !isMineEntry(tags) && geometry
			? [{ subject, tags, geometry }]
			: [];
	});
}

/** How near a buried river's line must pass to run under where you stand, in metres. */
const BENEATH_REACH = 20;

/** A named river, stream or drain the map runs under the ground, and how: in a culvert, a tunnel. */
export interface Beneath {
	name: string;
	how: string;
}

/** How near a place must lie to a river's line to be on its course, in metres. */
const COURSE_REACH = 40;

/** A named river's course: its places in the order it flows, each where it shows or runs hidden. */
export interface Course {
	name: string;
	points: { stop: StopId; hidden: boolean }[];
}

/** Metres between two points, flat enough over a river's few kilometres. */
const flat = (a: LatLon, b: LatLon): [number, number] => [
	(b[1] - a[1]) * 111_320 * Math.cos((a[0] * Math.PI) / 180),
	(b[0] - a[0]) * 110_540
];

/** Where along a line a point comes nearest: how far along it, and how far off. */
function along(p: LatLon, line: readonly LatLon[]): { offset: number; metres: number } {
	let best = { offset: 0, metres: Infinity };
	let walked = 0;
	for (let i = 1; i < line.length; i++) {
		const [dx, dy] = flat(line[i - 1], line[i]);
		const [px, py] = flat(line[i - 1], p);
		const length = Math.hypot(dx, dy);
		const t = length ? Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length))) : 0;
		const metres = Math.hypot(px - t * dx, py - t * dy);
		if (metres < best.metres) best = { offset: walked + t * length, metres };
		walked += length;
	}
	return best;
}

const lengthOf = (line: readonly LatLon[]) =>
	line.slice(1).reduce((m, p, i) => m + Math.hypot(...flat(line[i], p)), 0);
const same = (a: LatLon, b: LatLon) => a[0] === b[0] && a[1] === b[1];

/** How far apart two of a river's ways may end and begin and still be one course, in metres. */
const COURSE_GAP = 50;

/**
 * A river's ways as courses, each from a source (a way nothing flows into) down to where the map's
 * line ends, as the map draws a river downstream: on to the way beginning where one ends, else to the
 * nearest beginning within a short gap. Two arms that meet are two courses, sharing what lies below.
 */
function coursesOf(ways: readonly Named[]): Named[][] {
	const flowsInto = (w: Named) =>
		ways.some((v) => v !== w && same(v.geometry.at(-1)!, w.geometry[0]));
	const sources = ways.filter((w) => !flowsInto(w));
	const paths = (sources.length ? sources : [ways[0]]).map((source) => {
		const path = [source];
		for (;;) {
			const end = path.at(-1)!.geometry.at(-1)!;
			const free = ways.filter((w) => !path.includes(w));
			const next =
				free.find((w) => same(w.geometry[0], end)) ??
				free
					.map((w) => ({ w, metres: Math.hypot(...flat(end, w.geometry[0])) }))
					.filter((c) => c.metres <= COURSE_GAP)
					.sort((a, b) => a.metres - b.metres)[0]?.w;
			if (!next) return path;
			path.push(next);
		}
	});
	// A course wholly within another, as the stretch below a gap is, adds nothing.
	return paths.filter(
		(p, i) => !paths.some((q, j) => j !== i && q.length > p.length && p.every((w) => q.includes(w)))
	);
}

/** How near something addressed to another street must be to be told here, in metres. */
const OFF_STREET_REACH = 12;

/** The pipeline from snapshot to narration: facts, perception, tensions, slippage, rendering. */
export class Narrator {
	private readonly renderer: Renderer;
	private readonly areas: AreaRecord[];
	/** What others keep beyond the map's edge, by whom. */
	readonly beyond: Beyond[];
	private readonly zones: AreaRecord[];
	/** The named things, filed by where they lie, so the nearest is sought only among those near. */
	private readonly namedGrid = new Grid<number>(NEAREST_NAME_REACH);

	constructor(
		readonly graph: StopGraph,
		private readonly perception: Perception,
		private readonly options: NarratorOptions,
		/** What the map and the other accounts hold, as a whole: for Guide's introduction. */
		readonly ledger: MapLedger = { streets: 0, accounts: [] },
		/** The map's named things, for the nearest name at a stop with none in view. */
		private readonly named: Named[] = []
	) {
		this.renderer = options.renderer ?? new AdventureRenderer();
		named.forEach((thing, i) => {
			if (thing.geometry.length) this.namedGrid.add(i, boxOf(thing.geometry));
		});
		const stores = options.records ?? [];
		this.areas = stores.filter((s) => !s.overlay).flatMap((store) => store.areas ?? []);
		this.zones = stores.filter((s) => s.overlay).flatMap((store) => store.areas ?? []);
		this.beyond = stores.flatMap((store) =>
			(store.beyond ?? []).map((b) => ({ ...b, source: store.source }))
		);
	}

	static fromOsm(data: OsmData, options: NarratorOptions): Narrator {
		const osm = new OsmIndex(data);
		const past = (options.history ?? []).map((h) => ({ asOf: h.asOf, osm: new OsmIndex(h.data) }));
		const facts = [
			...new OsmAdapter(osm).facts(),
			...new HistoryAdapter(osm, past).facts(),
			...(options.wikidata ? new WikidataAdapter(osm, options.wikidata).facts() : []),
			...(options.records ?? []).flatMap((store) => new RecordsAdapter(osm, store).facts())
		];
		return new Narrator(
			buildStopGraph(osm, {
				...options,
				// A plaque is worth stopping at, wherever it is recorded.
				landmarks: facts
					.filter((f) => f.claim.key === 'plaque:inscription' && f.geometry.length)
					.map((f) => f.geometry[0])
			}),
			Perception.fromOsm(osm, facts),
			options,
			ledgerOf(osm, facts, options.records ?? []),
			namedThings(facts)
		);
	}

	/** The nearest named thing out of view, when nothing named is in view here. */
	private nearestName(at: LatLon, plan: NarrationPlan, seen: readonly Fact[]): Scene['nearest'] {
		// An empty stop stays empty: the nearest name is for a quiet stop, with things but no names.
		const things = plan.beats.filter((b) => !isBackground(b));
		if (!things.length) return undefined;
		if (things.some((b) => b.facts.some((f) => f.claim.key === 'name' && !isElsewhere(f))))
			return undefined;
		// Nothing in view either, told or left for the reader to find by exploring.
		const inView = new Set(seen.map((f) => f.subject));
		let best: Scene['nearest'];
		// Only those filed near enough to be measured, taken in the map's own order, so a tie
		// goes the same way as it would through them all. The reach is widened a little, as
		// the grid's degrees and the measure's metres differ by a fraction.
		const near = [...this.namedGrid.near(boxOf([at], NEAREST_NAME_REACH * 1.05))].sort(
			(a, b) => a - b
		);
		for (const i of near) {
			const thing = this.named[i];
			if (inView.has(thing.subject)) continue;
			const { point, metres } = nearestOnPolyline(at, thing.geometry);
			if (metres <= NEAREST_NAME_REACH && (!best || metres < best.metres))
				best = { tags: thing.tags, metres, bearing: bearing(at, point) };
		}
		return best;
	}

	/**
	 * The named rivers, streams and drains the map runs under the ground beneath a point, each once,
	 * in the map's own order: an open stretch, an unnamed culvert, and one further off are not.
	 */
	beneathAt(at: LatLon): Beneath[] {
		const found = new Map<string, string>();
		const near = [...this.namedGrid.near(boxOf([at], BENEATH_REACH * 1.05))].sort((a, b) => a - b);
		for (const i of near) {
			const { tags, geometry } = this.named[i];
			const how = tags.waterway && tags.tunnel ? WAY_IN[tags.tunnel] : undefined;
			if (!how || found.has(tags.name)) continue;
			if (nearestOnPolyline(at, geometry).metres <= BENEATH_REACH) found.set(tags.name, how);
		}
		return [...found].map(([name, how]) => ({ name, how }));
	}

	/**
	 * Every named river, stream or drain the map draws, as a course: the places within reach of its
	 * line, in the order it flows, each marked where it runs hidden (in a culvert or a tunnel).
	 */
	courses(): Course[] {
		const rivers = new Map<string, Named[]>();
		for (const thing of this.named)
			if (thing.tags.waterway && thing.geometry.length > 1)
				rivers.set(thing.tags.name, [...(rivers.get(thing.tags.name) ?? []), thing]);
		const stops = this.graph.all();
		return [...rivers].flatMap(([name, ways]) =>
			coursesOf(ways).flatMap((order) => this.courseAlong(name, order, stops))
		);
	}

	/** The places within reach of one course's line, in the order it flows. */
	private courseAlong(name: string, order: readonly Named[], stops: readonly Stop[]): Course[] {
		const [south, west, north, east] = boxOf(
			order.flatMap((w) => w.geometry),
			COURSE_REACH
		);
		let start = 0;
		const lines = order.map((w) => {
			const at = start;
			start += lengthOf(w.geometry);
			return { at, way: w };
		});
		const points = stops.flatMap((stop) => {
			const [lat, lon] = stop.position;
			if (lat < south || lat > north || lon < west || lon > east) return [];
			let best: { offset: number; metres: number; hidden: boolean } | undefined;
			for (const { at, way } of lines) {
				const { offset, metres } = along(stop.position, way.geometry);
				if (!best || metres < best.metres)
					best = { offset: at + offset, metres, hidden: !!way.tags.tunnel };
			}
			return best && best.metres <= COURSE_REACH
				? [{ stop: stop.id, hidden: best.hidden, offset: best.offset }]
				: [];
		});
		points.sort((a, b) => a.offset - b.offset);
		return points.length
			? [{ name, points: points.map(({ stop, hidden }) => ({ stop, hidden })) }]
			: [];
	}

	/** Every zone another account draws over a point, such as flood zones. */
	zonesAt(p: LatLon): AreaRecord[] {
		return this.zones.filter(
			(z) =>
				z.rings.some((ring) => insideRing(p, ring)) &&
				!(z.holes ?? []).some((hole) => insideRing(p, hole))
		);
	}

	/** The area another account puts a point in, such as a ward, if any. */
	areaAt(p: LatLon): AreaRecord | undefined {
		return areaAt(p, this.areas);
	}

	visit(id: StopId): Visit | undefined {
		const stop = this.graph.get(id);
		if (!stop) return undefined;
		const near = (f: Fact) => distanceToPolyline(stop.position, f.geometry);
		// Something addressed to a street that does not meet this stop is told only right beside it.
		const streets = new Set(stop.exits.map((e) => e.street).filter(Boolean));
		// What is in view from the stop, and along its half of each street to the next stops.
		const seen = [
			...new Set([stop.position, ...stop.stretch].flatMap((p) => this.perception.inView(p)))
		];
		const addressed = new Map<string, string>();
		for (const f of seen)
			if (f.claim.key === 'addr:street' || f.claim.key === 'was:addr:street')
				addressed.set(f.subject, f.claim.value);
		const inView = seen
			.filter((f) => {
				const street = addressed.get(f.subject);
				return !street || streets.has(street) || near(f) <= OFF_STREET_REACH;
			})
			.sort((a, b) => near(a) - near(b));
		const plan = chooseSlippage(
			id,
			inView,
			detectTensions(inView, this.options.clock, this.options)
		);
		const nearest = this.nearestName(stop.position, plan, inView);
		const scene = { ...buildScene(this.graph, stop, plan), ...(nearest ? { nearest } : {}) };
		const room = this.renderer.render(scene);
		return {
			stop,
			inView,
			plan,
			scene,
			room,
			text: room.paragraphs.join('\n\n'),
			exits: stop.exits
		};
	}

	nearestStop(at: LatLon): Stop | undefined {
		let best: Stop | undefined;
		for (const s of this.graph.all()) {
			if (!best || distance(at, s.position) < distance(at, best.position)) best = s;
		}
		return best;
	}
}
