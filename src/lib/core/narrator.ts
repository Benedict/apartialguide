import { OsmAdapter } from './adapters/osm';
import type { Clock, Fact } from './facts';
import { distance, distanceToPolyline, type LatLon } from './geo';
import { OsmIndex, type OsmData } from './osm';
import { Perception } from './perception';
import type { Renderer } from './render/renderer';
import { TemplateRenderer } from './render/template';
import { chooseSlippage, type NarrationPlan } from './slippage';
import { buildStopGraph, type Exit, type Stop, type StopGraph, type StopId } from './stops';
import { detectTensions, type TensionOptions } from './tensions';

export interface NarratorOptions extends TensionOptions {
	clock: Clock;
	renderer?: Renderer;
	/** Largest gap between stops along a street, in metres. */
	spacing?: number;
}

export interface Visit {
	stop: Stop;
	inView: Fact[];
	plan: NarrationPlan;
	text: string;
	exits: Exit[];
}

/** The pipeline from snapshot to narration: facts, perception, tensions, slippage, rendering. */
export class Narrator {
	private readonly renderer: Renderer;

	constructor(
		readonly graph: StopGraph,
		private readonly perception: Perception,
		private readonly options: NarratorOptions
	) {
		this.renderer = options.renderer ?? new TemplateRenderer();
	}

	static fromOsm(data: OsmData, options: NarratorOptions): Narrator {
		const osm = new OsmIndex(data);
		const facts = new OsmAdapter(osm).facts();
		return new Narrator(buildStopGraph(osm, options), Perception.fromOsm(osm, facts), options);
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
		return { stop, inView, plan, text: this.renderer.render(plan), exits: stop.exits };
	}

	nearestStop(at: LatLon): Stop | undefined {
		let best: Stop | undefined;
		for (const s of this.graph.all()) {
			if (!best || distance(at, s.position) < distance(at, best.position)) best = s;
		}
		return best;
	}
}
