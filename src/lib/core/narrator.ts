import { HistoryAdapter } from './adapters/history';
import { OsmAdapter } from './adapters/osm';
import { WeatherAdapter, type WeatherStore } from './adapters/weather';
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
	/** The weather on the days the map records. */
	weather?: WeatherStore;
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

/** The pipeline from snapshot to narration: facts, perception, tensions, slippage, rendering. */
export class Narrator {
	private readonly renderer: Renderer;

	constructor(
		readonly graph: StopGraph,
		private readonly perception: Perception,
		private readonly options: NarratorOptions,
		/** The weather on recorded days: about no one place, so outside perception. */
		readonly weather: Fact[] = []
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
		const weather = options.weather ? new WeatherAdapter(options.weather).facts() : [];
		return new Narrator(
			buildStopGraph(osm, options),
			Perception.fromOsm(osm, facts),
			options,
			weather
		);
	}

	visit(id: StopId): Visit | undefined {
		const stop = this.graph.get(id);
		if (!stop) return undefined;
		const near = (f: Fact) => distanceToPolyline(stop.position, f.geometry);
		const inView = this.perception.inView(stop.position).sort((a, b) => near(a) - near(b));
		const plan = chooseSlippage(
			id,
			inView,
			detectTensions(inView, this.options.clock, this.options)
		);
		const scene = buildScene(this.graph, stop, plan, this.weather);
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
