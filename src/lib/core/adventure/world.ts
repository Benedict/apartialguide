import type { Narrator } from '../narrator';
import type { Thing } from '../render/renderer';
import type { StopId } from '../stops';
import { looksBroken, NAME_KEY } from '../tensions';

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
	/** Broken names spoken here, for Guide to carry on. */
	fragments?: string[];
	/** What a closer look finds, if anything is hidden here. */
	hidden?: { lines: string[]; things: Thing[] };
}

/** Every stop's narration, written ahead of time. The game plays from this alone. */
export interface AdventureWorld {
	start: StopId;
	stops: Record<StopId, CompiledStop>;
	/** The date of the map Guide carries, YYYY-MM-DD. */
	asOf?: string;
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
		const { room, plan } = narrator.visit(stop.id)!;
		const fragments = [
			...new Set(
				plan.beats
					.filter((b) => b.effects.includes('spoken-as-found'))
					.flatMap((b) => b.facts)
					.filter((f) => NAME_KEY.test(f.claim.key) && looksBroken(f.claim.value))
					.map((f) => f.claim.value)
			)
		];
		stops[stop.id] = {
			title: room.title,
			paragraphs: room.paragraphs,
			exits: stop.exits.map(({ label, to, street }) => ({ label, to, street })),
			things: room.things,
			...(room.hidden ? { hidden: room.hidden } : {}),
			...(fragments.length ? { fragments } : {})
		};
	}
	const begins = narrator.graph.get(start)?.position;
	return {
		start,
		stops,
		...(options.asOf ? { asOf: options.asOf } : {}),
		...(begins
			? { weatherAt: { latitude: +begins[0].toFixed(4), longitude: +begins[1].toFixed(4) } }
			: {})
	};
}
