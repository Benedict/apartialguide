import { distance } from './geo';
import type { Narrator } from './narrator';
import { keepsBrokenNames, namesNoSource, type NarrationStore } from './render/cached';
import { unfounded } from './render/founded';
import { buildPrompt, promptKey, type Prompt } from './render/prompt';
import type { Scene } from './scene';
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
	/** Which stops to narrate; the rest keep the template. All, if not given. */
	only?: (scene: Scene) => boolean;
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
	/** Stops whose prose reused a turn of phrase already in several places. */
	repeated: { stop: StopId; phrase: string }[];
	/** Stops left to the template because `only` passed them over. */
	skipped: number;
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
	{
		limit = Infinity,
		from,
		today = new Date().toISOString().slice(0, 10),
		only
	}: NarrateOptions = {}
): Promise<NarrateResult> {
	const result: NarrateResult = {
		written: 0,
		kept: 0,
		remaining: 0,
		rejected: [],
		declined: [],
		unfounded: [],
		repeated: [],
		skipped: 0
	};
	// Only prose a reader can meet counts: pieces kept for stops the map no longer has do not.
	const current = new Set(
		narrator.graph.all().map((s) => promptKey(buildPrompt(narrator.visit(s.id)!.scene)))
	);
	const used = phrasesIn(store, current);
	let calls = 0;
	for (const stop of order(narrator, from)) {
		const { scene } = narrator.visit(stop)!;
		if (only && !only(scene)) {
			result.skipped++;
			continue;
		}
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
		const phrase = repeatedPhrase(paragraphs, prompt.user, used);
		if (phrase) result.repeated.push({ stop, phrase });
		if (
			!keepsBrokenNames(scene, paragraphs) ||
			!namesNoSource(scene, paragraphs) ||
			words.length ||
			phrase
		) {
			result.rejected.push(stop);
			continue;
		}
		store[key] = { paragraphs, model: model.name, written: today };
		for (const gram of grams(paragraphs.join(' '))) used.set(gram, (used.get(gram) ?? 0) + 1);
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

/** How many words make a turn of phrase, and in how many places it may already stand. */
const PHRASE_WORDS = 6;
const PHRASE_PLACES = 3;
/** How many of its words must be Guide's own, not the facts', for a run to be a turn of phrase. */
const OWN_WORDS = 2;

const wordsOf = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}’'\s]/gu, ' ')
		.split(/\s+/)
		.filter(Boolean);

/** Every run of six words in a text, once each. */
function grams(text: string): Set<string> {
	const w = wordsOf(text);
	const out = new Set<string>();
	for (let i = 0; i + PHRASE_WORDS <= w.length; i++)
		out.add(w.slice(i, i + PHRASE_WORDS).join(' '));
	return out;
}

/** How many stored pieces for the current stops each run of six words stands in. */
function phrasesIn(store: NarrationStore, current: ReadonlySet<string>): Map<string, number> {
	const used = new Map<string, number>();
	for (const [key, entry] of Object.entries(store))
		if (current.has(key))
			for (const gram of grams(entry.paragraphs.join(' ')))
				used.set(gram, (used.get(gram) ?? 0) + 1);
	return used;
}

/** Lines of a prompt that tell the writer what to do, rather than give facts. */
const INSTRUCTION =
	/^(do not|speak|say|give|lose|hesitate|the place is|there is little|already said|— )/i;

/** The words a stop's facts give, leaving out the prompt's instructions and its neighbours. */
function factWords(user: string): Set<string> {
	const facts = user.split(/\n\nAlready said/)[0];
	return new Set(
		facts
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => !INSTRUCTION.test(l))
			.flatMap(wordsOf)
	);
}

/**
 * A turn of phrase of Guide's own already in several stored pieces, if the prose reuses one. A run
 * counts as Guide's own only where two or more of its words are not the stop's facts: the facts
 * may be said again, in any order, as often as they recur.
 */
function repeatedPhrase(
	paragraphs: readonly string[],
	user: string,
	used: Map<string, number>
): string | undefined {
	const facts = factWords(user);
	for (const gram of grams(paragraphs.join(' '))) {
		if ((used.get(gram) ?? 0) < PHRASE_PLACES) continue;
		if (gram.split(' ').filter((w) => !facts.has(w)).length >= OWN_WORDS) return gram;
	}
	return undefined;
}
