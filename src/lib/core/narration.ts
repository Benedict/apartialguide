import { distance } from './geo';
import type { Narrator } from './narrator';
import { keepsBrokenNames, type NarrationStore } from './render/cached';
import { buildPrompt, promptKey, type Prompt } from './render/prompt';
import type { StopId } from './stops';

/** Something that writes a stop's prose from its prompt. Undefined means it declined. */
export interface ProseModel {
	readonly name: string;
	write(prompt: Prompt): Promise<string | undefined>;
}

export interface NarrateOptions {
	/** Most model calls to make in this run, which caps its cost. */
	limit?: number;
	/** Narrate stops nearest this one first. */
	from?: StopId;
	/** The day the prose is written, as YYYY-MM-DD. */
	today?: string;
}

export interface NarrateResult {
	written: number;
	/** Stops that already had prose for their current facts. */
	kept: number;
	/** Stops left for a later run because the limit was reached. */
	remaining: number;
	/** Stops whose prose repaired a broken name, so was not stored. */
	rejected: StopId[];
	/** Stops the model declined to write. */
	declined: StopId[];
}

/**
 * Writes prose ahead of time for every stop that has none for its current facts, and adds it
 * to `store`. Stops whose facts are unchanged keep what they have, so a later run redoes only
 * what changed.
 */
export async function narrateWorld(
	narrator: Narrator,
	model: ProseModel,
	store: NarrationStore,
	{ limit = Infinity, from, today = new Date().toISOString().slice(0, 10) }: NarrateOptions = {}
): Promise<NarrateResult> {
	const result: NarrateResult = { written: 0, kept: 0, remaining: 0, rejected: [], declined: [] };
	let calls = 0;
	for (const stop of order(narrator, from)) {
		const { scene } = narrator.visit(stop)!;
		const prompt = buildPrompt(scene);
		const key = promptKey(prompt);
		if (store[key]) {
			result.kept++;
			continue;
		}
		if (calls >= limit) {
			result.remaining++;
			continue;
		}
		calls++;
		const text = await model.write(prompt);
		if (text === undefined) {
			result.declined.push(stop);
			continue;
		}
		const paragraphs = text
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter(Boolean);
		if (!keepsBrokenNames(scene, paragraphs)) {
			result.rejected.push(stop);
			continue;
		}
		store[key] = { paragraphs, model: model.name, written: today };
		result.written++;
	}
	return result;
}

function order(narrator: Narrator, from?: StopId): StopId[] {
	const stops = narrator.graph.all();
	const origin = from ? narrator.graph.get(from)?.position : undefined;
	if (!origin) return stops.map((s) => s.id);
	return stops
		.map((s) => ({ id: s.id, d: distance(origin, s.position) }))
		.sort((a, b) => a.d - b.d)
		.map((s) => s.id);
}
