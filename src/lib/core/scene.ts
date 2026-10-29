import type { Tags } from './osm';
import { polylineLength, type LatLon } from './geo';
import type { NarrationPlan } from './slippage';
import type { Stop, StopGraph, StopId } from './stops';

export interface SceneExit {
	label: string;
	to: StopId;
	street?: string;
	/** What the street leads to: the next street it meets, or "a dead end". */
	towards?: string;
	/** How far that is, from stop to stop along the street, in metres. */
	metres?: number;
}

/** A plan placed in the street network: where the stop is and where its exits lead. */
export interface Scene extends NarrationPlan {
	position: LatLon;
	kind: Stop['kind'];
	/** Names of the streets at this stop. */
	here: string[];
	/** For a stop part way along a street, what lies at either end. */
	between?: [string | undefined, string | undefined];
	exits: SceneExit[];
	/** At a stop with nothing named in view, the nearest named thing out of view. */
	nearest?: { tags: Tags; metres: number; bearing: number };
}

export function buildScene(graph: StopGraph, stop: Stop, plan: NarrationPlan): Scene {
	const exits = stop.exits.map((e) => ({
		label: e.label,
		to: e.to,
		street: e.street,
		towards: towards(graph, stop.id, e.label, e.street),
		metres: along(graph, stop.id, e.label)
	}));
	const here = [...new Set(stop.exits.map((e) => e.street).filter((s): s is string => !!s))];
	return {
		...plan,
		position: stop.position,
		kind: stop.kind,
		here,
		between: stop.kind === 'corridor' ? [exits[0]?.towards, exits[1]?.towards] : undefined,
		exits
	};
}

/** The distance from stop to stop along an exit, to the next junction or the end. */
function along(graph: StopGraph, from: StopId, label: string): number {
	const path = graph.walk(from, label).map((id) => graph.get(id)!.position);
	return polylineLength(path);
}

function towards(
	graph: StopGraph,
	from: StopId,
	label: string,
	street?: string
): string | undefined {
	const end = graph.get(graph.walk(from, label).at(-1)!)!;
	if (end.exits.length === 1) return 'a dead end';
	const others = [...new Set(end.exits.map((e) => e.street).filter((s) => s && s !== street))];
	return others[0];
}
