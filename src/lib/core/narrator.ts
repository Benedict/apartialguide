import { HistoryAdapter } from './adapters/history';
import { OsmAdapter } from './adapters/osm';
import { WikidataAdapter, type WikidataStore } from './adapters/wikidata';
import type { Clock, Fact } from './facts';
import { distance, distanceToPolyline, type LatLon } from './geo';
import { OsmIndex, type OsmData } from './osm';
import { Perception } from './perception';
import { AdventureRenderer } from './render/adventure';
import type { Renderer, Room } from './render/renderer';
import { buildScene, type Scene } from './scene';
import { chooseSlippage, type NarrationPlan } from './slippage';
import { buildStopGraph, type Exit, type Stop, type StopGraph, type StopId } from './stops';
import { detectTensions, type TensionOptions } from './tensions';

export interface NarratorOptions extends TensionOptions {
	clock: Clock;
	renderer?: Renderer;
	/** Largest gap between stops along a street, in metres. */
	spacing?: number;
	/** Earlier maps of the same place, for what has gone or been renamed. */
	history?: { asOf: string; data: OsmData }[];
	/** Another account of the place, from Wikidata. */
	wikidata?: WikidataStore;
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

/** How near something addressed to another street must be to be told here, in metres. */
const OFF_STREET_REACH = 12;

/** The pipeline from snapshot to narration: facts, perception, tensions, slippage, rendering. */
export class Narrator {
	private readonly renderer: Renderer;

	constructor(
		readonly graph: StopGraph,
		private readonly perception: Perception,
		private readonly options: NarratorOptions
	) {
		this.renderer = options.renderer ?? new AdventureRenderer();
	}

	static fromOsm(data: OsmData, options: NarratorOptions): Narrator {
		const osm = new OsmIndex(data);
		const past = (options.history ?? []).map((h) => ({ asOf: h.asOf, osm: new OsmIndex(h.data) }));
		const facts = [
			...new OsmAdapter(osm).facts(),
			...new HistoryAdapter(osm, past).facts(),
			...(options.wikidata ? new WikidataAdapter(osm, options.wikidata).facts() : [])
		];
		return new Narrator(buildStopGraph(osm, options), Perception.fromOsm(osm, facts), options);
	}

	visit(id: StopId): Visit | undefined {
		const stop = this.graph.get(id);
		if (!stop) return undefined;
		const near = (f: Fact) => distanceToPolyline(stop.position, f.geometry);
		// Something addressed to a street that does not meet this stop is told only right beside it.
		const streets = new Set(stop.exits.map((e) => e.street).filter(Boolean));
		const addressed = new Map<string, string>();
		for (const f of this.perception.inView(stop.position))
			if (f.claim.key === 'addr:street' || f.claim.key === 'was:addr:street')
				addressed.set(f.subject, f.claim.value);
		const inView = this.perception
			.inView(stop.position)
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
