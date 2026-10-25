import type { Fact } from './facts';
import type { LatLon } from './geo';
import type { NarrationPlan } from './slippage';
import type { Stop, StopGraph, StopId } from './stops';

export interface SceneExit {
	label: string;
	to: StopId;
	street?: string;
	/** What the street leads to: the next street it meets, or "a dead end". */
	towards?: string;
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
	/** The weather on recorded days, for what was recorded on them. */
	weather?: Fact[];
}

export function buildScene(
	graph: StopGraph,
	stop: Stop,
	plan: NarrationPlan,
	weather: Fact[] = []
): Scene {
	const exits = stop.exits.map((e) => ({
		label: e.label,
		to: e.to,
		street: e.street,
		towards: towards(graph, stop.id, e.label, e.street)
	}));
	const here = [...new Set(stop.exits.map((e) => e.street).filter((s): s is string => !!s))];
	return {
		...plan,
		position: stop.position,
		kind: stop.kind,
		here,
		between: stop.kind === 'corridor' ? [exits[0]?.towards, exits[1]?.towards] : undefined,
		exits,
		weather
	};
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
