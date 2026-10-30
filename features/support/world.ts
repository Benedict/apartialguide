import { setWorldConstructor, World } from '@cucumber/cucumber';
import { fixedClock } from '../../src/lib/core/facts';
import { Narrator, type Visit } from '../../src/lib/core/narrator';
import type { OsmData } from '../../src/lib/core/osm';
import type { Renderer } from '../../src/lib/core/render/renderer';
import type { RecordStore } from '../../src/lib/core/adapters/records';
import type { WikidataStore } from '../../src/lib/core/adapters/wikidata';
import type { StopId } from '../../src/lib/core/stops';
import { SyntheticMap } from '../../src/lib/core/testing/synthetic';

export class NarratorWorld extends World {
	map = new SyntheticMap();
	data?: OsmData;
	snapshotDate = '2026-10-24';
	here?: StopId;
	path: StopId[] = [];
	offered: string[] = [];
	visit?: Visit;
	/** The nodes of the street a scenario laid down, with how far along each lies, in metres. */
	street: { id: number; metres: number }[] = [];
	/** How far along the street each named place a scenario set down stands, in metres. */
	placed: Record<string, number> = {};
	/** OSM refs of the features a scenario is about. */
	subjects: string[] = [];
	/** The renderer the narrator uses, when a scenario sets one. */
	renderer?: Renderer;
	/** Earlier maps of the same place, when a scenario sets them. */
	history: { asOf: string; data: OsmData }[] = [];
	/** What Wikidata holds, when a scenario sets it. */
	wikidata?: WikidataStore;
	/** Other sources' records, when a scenario sets them. */
	records: RecordStore[] = [];
	private built?: Narrator;

	get narrator(): Narrator {
		this.built ??= Narrator.fromOsm(this.data ?? this.map.toData(), {
			clock: fixedClock(this.snapshotDate),
			renderer: this.renderer,
			history: this.history,
			wikidata: this.wikidata,
			records: this.records
		});
		return this.built;
	}

	/** Forget the built narrator, so features added to the map since are seen. */
	rebuild() {
		this.built = undefined;
	}

	arrive(id: StopId | undefined) {
		if (!id) throw new Error('no stop to arrive at');
		this.here = id;
		this.visit = this.narrator.visit(id);
	}
}

setWorldConstructor(NarratorWorld);
