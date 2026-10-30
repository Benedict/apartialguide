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
import { OsmIndex, type OsmData, type Tags } from './osm';
import { Perception } from './perception';
import { AdventureRenderer } from './render/adventure';
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
		return tags.name && !tags.highway && geometry ? [{ subject, tags, geometry }] : [];
	});
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
		for (const thing of this.named) {
			if (inView.has(thing.subject)) continue;
			const { point, metres } = nearestOnPolyline(at, thing.geometry);
			if (metres <= NEAREST_NAME_REACH && (!best || metres < best.metres))
				best = { tags: thing.tags, metres, bearing: bearing(at, point) };
		}
		return best;
	}

	/** Every zone another account draws over a point, such as flood zones. */
	zonesAt(p: LatLon): AreaRecord[] {
		return this.zones.filter((z) => z.rings.some((ring) => insideRing(p, ring)));
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
