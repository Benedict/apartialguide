import { HistoryAdapter } from './adapters/history';
import { OsmAdapter } from './adapters/osm';
import { WikidataAdapter, type WikidataStore } from './adapters/wikidata';
import { RecordsAdapter, type RecordStore } from './adapters/records';
import { areaAt, type AreaRecord } from './areas';
import type { Clock, Fact } from './facts';
import { distance, distanceToPolyline, type LatLon } from './geo';
import { OsmIndex, type OsmData } from './osm';
import { Perception } from './perception';
import { AdventureRenderer } from './render/adventure';
import type { Renderer, Room } from './render/renderer';
import { buildScene, type Scene } from './scene';
import { chooseSlippage, type NarrationPlan } from './slippage';
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

/** A keeper's name as found, without the file or layer a fetch noted after it. */
const keeper = (source: string) =>
	source === 'wikidata' ? 'Wikidata' : source.split(/,|\(/)[0].trim();

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

/** How near something addressed to another street must be to be told here, in metres. */
const OFF_STREET_REACH = 12;

/** The pipeline from snapshot to narration: facts, perception, tensions, slippage, rendering. */
export class Narrator {
	private readonly renderer: Renderer;
	private readonly areas: AreaRecord[];

	constructor(
		readonly graph: StopGraph,
		private readonly perception: Perception,
		private readonly options: NarratorOptions,
		/** What the map and the other accounts hold, as a whole: for Guide's introduction. */
		readonly ledger: MapLedger = { streets: 0, accounts: [] }
	) {
		this.renderer = options.renderer ?? new AdventureRenderer();
		this.areas = (options.records ?? []).flatMap((store) => store.areas ?? []);
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
			buildStopGraph(osm, options),
			Perception.fromOsm(osm, facts),
			options,
			ledgerOf(osm, facts, options.records ?? [])
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
		const seen = this.perception.inView(stop.position);
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
		const scene = buildScene(this.graph, stop, plan);
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
