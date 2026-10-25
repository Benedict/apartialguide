import type { Narrator } from '../narrator';
import type { Thing } from '../render/renderer';
import type { StopId } from '../stops';

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
	/** The date of the map Guide carries, YYYY-MM-DD. */
	asOf?: string;
}

export function compileWorld(
	narrator: Narrator,
	start: StopId,
	options: { asOf?: string } = {}
): AdventureWorld {
	const stops: Record<StopId, CompiledStop> = {};
	for (const stop of narrator.graph.all()) {
		const { room } = narrator.visit(stop.id)!;
		stops[stop.id] = {
			title: room.title,
			paragraphs: room.paragraphs,
			exits: stop.exits.map(({ label, to, street }) => ({ label, to, street })),
			things: room.things,
			...(room.hidden ? { hidden: room.hidden } : {})
		};
	}
	return { start, stops, ...(options.asOf ? { asOf: options.asOf } : {}) };
}
