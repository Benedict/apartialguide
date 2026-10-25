import type { LatLon } from '../geo';
import type { Narrator } from '../narrator';
import type { Thing } from '../render/renderer';
import type { StopId } from '../stops';
import { buildGazetteer } from './gazetteer';
import type { Place } from './places';

export interface CompiledExit {
	label: string;
	to: StopId;
	street?: string;
}

export interface CompiledStop {
	title: string;
	paragraphs: string[];
	exits: CompiledExit[];
	things: Thing[];
	/** What a closer look finds, if anything is hidden here. */
	hidden?: { lines: string[]; things: Thing[] };
}

/** Every stop's narration, written ahead of time. The game plays from this alone. */
export interface AdventureWorld {
	start: StopId;
	stops: Record<StopId, CompiledStop>;
	/** Where each stop stands, to begin from where the reader is. */
	positions?: Record<StopId, LatLon>;
	/** Names the reader may give to begin somewhere. */
	places?: Place[];
	/** The date of the map Guide carries, YYYY-MM-DD. */
	asOf?: string;
}

/** Six decimal places is about ten centimetres: closer than any stop needs. */
const rounded = ([lat, lon]: LatLon): LatLon => [+lat.toFixed(6), +lon.toFixed(6)];

export function compileWorld(
	narrator: Narrator,
	start: StopId,
	options: { asOf?: string } = {}
): AdventureWorld {
	const stops: Record<StopId, CompiledStop> = {};
	const positions: Record<StopId, LatLon> = {};
	for (const stop of narrator.graph.all()) {
		const { room } = narrator.visit(stop.id)!;
		positions[stop.id] = rounded(stop.position);
		stops[stop.id] = {
			title: room.title,
			paragraphs: room.paragraphs,
			exits: stop.exits.map(({ label, to, street }) => ({ label, to, street })),
			things: room.things,
			...(room.hidden ? { hidden: room.hidden } : {})
		};
	}
	return {
		start,
		stops,
		positions,
		places: narrator.osm ? buildGazetteer(narrator.osm, narrator.graph) : [],
		...(options.asOf ? { asOf: options.asOf } : {})
	};
}
