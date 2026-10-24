import { setWorldConstructor, World } from '@cucumber/cucumber';
import { fixedClock } from '../../src/lib/core/facts';
import { Narrator, type Visit } from '../../src/lib/core/narrator';
import type { OsmData } from '../../src/lib/core/osm';
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
	/** OSM refs of the features a scenario is about. */
	subjects: string[] = [];
	private built?: Narrator;

	get narrator(): Narrator {
		this.built ??= Narrator.fromOsm(this.data ?? this.map.toData(), {
			clock: fixedClock(this.snapshotDate)
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
