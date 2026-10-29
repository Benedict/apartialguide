import { distance } from './geo';
import type { Narrator } from './narrator';
import { keepsBrokenNames, namesNoSource, type NarrationStore } from './render/cached';
import { unfounded } from './render/founded';
import { buildPrompt, promptKey, type Prompt } from './render/prompt';
import type { StopId } from './stops';

/** Something that writes a stop's prose from its prompt. Undefined means it declined. */
export interface ProseModel {
	readonly name: string;
	/** `about` names the stop and the key its prose is kept under, for prose written elsewhere. */
	write(prompt: Prompt, about?: { stop: StopId; key: string }): Promise<string | undefined>;
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
	/** Stops whose prose said what the facts do not: the words it could not found on them. */
	unfounded: { stop: StopId; words: string[] }[];
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
	const result: NarrateResult = {
		written: 0,
		kept: 0,
		remaining: 0,
		rejected: [],
		declined: [],
		unfounded: []
	};
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
		const text = await model.write(withNeighbours(prompt, neighboursSaid(narrator, stop, store)), {
			stop,
			key
		});
		if (text === undefined) {
			result.declined.push(stop);
			continue;
		}
		const paragraphs = text
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter(Boolean);
		const words = unfounded(prompt.user, paragraphs);
		if (words.length) result.unfounded.push({ stop, words });
		if (!keepsBrokenNames(scene, paragraphs) || !namesNoSource(scene, paragraphs) || words.length) {
			result.rejected.push(stop);
			continue;
		}
		store[key] = { paragraphs, model: model.name, written: today };
		result.written++;
	}
	return result;
}

/** The prose already written for the stops one step from this one, under their current facts. */
function neighboursSaid(narrator: Narrator, id: StopId, store: NarrationStore): string[] {
	const stop = narrator.graph.get(id);
	const next = [...new Set((stop?.exits ?? []).map((e) => e.to))];
	return next.flatMap((to) => {
		const visit = narrator.visit(to);
		const said = visit && store[promptKey(buildPrompt(visit.scene))];
		return said ? [said.paragraphs.join(' ')] : [];
	});
}

/**
 * The prompt as sent: with what the stops next door already say, so the model does not say it
 * again. Only the prompt without them makes the key, so prose is still found by a stop's facts.
 */
function withNeighbours(prompt: Prompt, said: string[]): Prompt {
	if (!said.length) return prompt;
	return {
		...prompt,
		user: [
			prompt.user,
			'',
			'Already said at the places next to this one. Do not repeat their remarks, jokes or turns of phrase; where you must give the same things, give them another way, briefly:',
			...said.map((p) => `— ${p}`)
		].join('\n')
	};
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
