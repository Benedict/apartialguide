import type { Narrator } from '../narrator';
import type { Thing } from '../render/renderer';
import type { StopId } from '../stops';
import { weatherThatDay } from '../render/weather';

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
	/** The weather that day, if it was recorded. */
	asOfWeather?: string;
	/** Where to ask about today's weather: where the tour begins. */
	weatherAt?: { latitude: number; longitude: number };
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
	const asOfWeather = weatherThatDay(narrator.weather, options.asOf);
	const begins = narrator.graph.get(start)?.position;
	return {
		start,
		stops,
		...(options.asOf ? { asOf: options.asOf } : {}),
		...(asOfWeather ? { asOfWeather } : {}),
		...(begins
			? { weatherAt: { latitude: +begins[0].toFixed(4), longitude: +begins[1].toFixed(4) } }
			: {})
	};
}
