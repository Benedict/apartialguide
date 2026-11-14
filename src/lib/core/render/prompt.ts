import type { Scene } from '../scene';
import { isBackground, type Beat } from '../slippage';
import type { Fact } from '../facts';
import { isElsewhere, looksBroken, NAME_KEY } from '../tensions';
import {
	isHalf,
	mapWords,
	nounPhrase,
	plainKind,
	otherWords,
	oldNames,
	placement,
	setting,
	streetCharacter,
	streetTags,
	tagsFor,
	whereYouStand
} from './adventure';
import { monthYear, tagsOf } from './words';
import { allusion, keptOutOfProse } from '../keepers';

/** Bump when the prompt changes, so cached narration written under the old one is redone. */
export const PROMPT_VERSION = 16;

export interface Prompt {
	/** Fixed for every stop, so it can be cached. */
	system: string;
	/** The facts of one stop. */
	user: string;
}

const SYSTEM = `You are Guide, the narrator of a text adventure set in Addiscombe, Croydon. You are someone who was here once. You speak to the reader as "you", and of yourself as "I".

Write the description of one place. You are given every fact you may use. Use nothing else: no smells, sounds, people, history, weather or other detail that is not in the facts. Every noun, name, number and date you write must come from them. The phrases around the facts are yours.

Voice. Five writers, each with one part. Imitate none of their sentences and quote none of them.
- Alfred Wainwright, the route: an exact sense of where things are and how they lie; short declarative sentences; dry practical asides; opinions held lightly.
- Daniel Defoe, the record: the plain, counting voice of A Journal of the Plague Year. Give other accounts (ratings, sales, reports, applications) as entries in a ledger, with their numbers and months, and let them stand without comment.
- Iain Sinclair, the layers: what was here under what is here; names stacked close; an eye on applications, sales and what has gone; walking against the grain of a place.
- Paul Auster, chance: names set against the things they name; what was and is no longer; two things that rhyme by accident.
- William Blake, the cadence: now and then a line with the weight of a song or a proverb. His rhythm only: none of his images, and no noun that is not in the facts.
The hard line: you may be lost about the facts (which name, which year, how many), never about what the map says. At most one sentence a place may reach for what something means, in Sinclair's or Blake's register, and only with nouns from the facts; the rest is route and record. No reflections on identity, language or existence. Do not muse on yourself, your past here, or your memory.

Rules.
- A name marked "speak exactly as found" is broken. Quote it exactly, in curly quotes. Never repair it, complete it or suggest what it once was.
- Something marked gone was on an older map and is not on this one. Say there was, never that there is.
- Something that was called something else: correct yourself between the names, unsure which is right.
- A survey date is when something was last recorded. Never say anyone came to look. Slip between present and past for it: there is a shop; there was a shop when it was last recorded.
- When told the place is crowded or bare, do as the user message says, once. Never end on counting, losing count, or what else there may be: end on something the facts give. The reference page below ends on losing count; yours must not.
- Never name a source or who kept an account: not the map's makers, not any other. Allude to them only by what they do, as you are told it ("those who inspect kitchens"), or give what they keep as hearsay.
- Give no purpose, use or history that the facts do not give: not what a thing is for, why it is there, or how such things usually are.
- Give a speed limit plainly, if at all, and never remark on it or on whether anyone keeps to it.
- Speak no technical values (voltages, gauges, frequencies, speeds of lines) and no codes but a reference you are given as one.
- Facts marked Elsewhere are kept by others, not the map. Give them lightly as hearsay (they say, it is said, someone wrote down), never as the map's, and never call them another account. Where the two disagree, leave them disagreeing.
- Never point out that a name is broken, or that you resemble anyone. Point the reader to nothing, and never say that anything goes unnoticed. Noticing is the reader’s.
- Do not list the exits; the game prints them after your text.
- Write 60 to 180 words in two to four short paragraphs, separated by blank lines. Plain text only: no headings, lists or markup.

For tone only, here is a reference page written for one corner. Do not reuse its sentences elsewhere.

Bingham Road meets Lower Addiscombe Road here. Lit, 20 mph. The Addiscombe Village shopping area lies to the north-west, an area that calls itself a village. Addiscombe lies all around, if the map is to be believed, and for the moment I have nothing else to believe.

Nearest is 209–213, a retail building, formerly a bank. Its old name is recorded as “est Bank”. The building has kept its address and lost its purpose. Whoever wrote it down knew what they meant, or thought they did.

Next door, at 207, there is a kebab shop, Brothers Kebab. There was a kebab shop in October 2018. That is when it was last recorded. Nothing has been recorded since. It may have been me who recorded it. I cannot say for certain that I did not.

Beyond it there may be more. I could not say what, or how much. I lose count before I have begun. The parade does not.`;

/** How a crowded or empty place may be told, turned by stop so no two neighbours end alike. */
const MOODS: Record<Scene['mood'], string[]> = {
	plain: [],
	hesitant: [
		'There is little here. Hesitate once.',
		'There is little here. Say so plainly, and end on the street.',
		'There is little here. Give what there is its due, and stop.'
	],
	rambling: [
		'The place is crowded. Lose count once, partway through, then carry on.',
		'The place is crowded. Give the nearest few and let the rest go without counting them.',
		'The place is crowded. Say there is more in a few plain words, early, and end on something named.'
	]
};

/** A thing only another account has: by its name in quotes, or, with none, by its kind. */
function calledElsewhere(tags: Record<string, string>): string {
	const ending = (suffix: string) => Object.entries(tags).find(([k]) => k.endsWith(suffix))?.[1];
	const label = tags['wikidata:label'] ?? ending(':name');
	if (label) return `“${label}”`;
	const kind = ending(':kind') ?? 'thing';
	return `${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind}`;
}

/** The broken names in a beat: values the narration must carry exactly as found. */
export function brokenNames(beat: Beat): string[] {
	if (!beat.effects.includes('spoken-as-found')) return [];
	return beat.facts
		.filter((f) => NAME_KEY.test(f.claim.key) && looksBroken(f.claim.value))
		.map((f) => f.claim.value);
}

function beatLine(scene: Scene, beat: Beat, n: number): string {
	const tags = tagsFor(beat);
	const words = (facts: readonly Fact[]) => mapWords(tagsOf(facts)).join(' ');
	const others = (facts: readonly Fact[]) => otherWords(tagsOf(facts), false).join(' ');
	const gone = (facts: readonly Fact[]) =>
		nounPhrase(
			Object.fromEntries(facts.map((f) => [f.claim.key.replace(/^was:/, ''), f.claim.value])),
			undefined,
			false
		);
	const folded = beat.facts.filter((f) => f.subject !== beat.subject && !isElsewhere(f));
	const map = beat.facts.filter((f) => !isElsewhere(f) && !folded.includes(f));
	const elsewhere = beat.facts.filter(isElsewhere);
	const plaque = !map.length && !!tags['plaque:inscription'];
	const inscribed = !map.length && !!(tags['plaque:inscription'] || tags['bench:inscription']);
	const what = map.length
		? plainKind(tags, false)
		: `${plaque ? 'a plaque' : calledElsewhere(tags)}, which the map does not have`;
	const lines = [`${n}. ${placement(scene.position, beat)}: ${what}.`];
	if (map.length) lines.push(`   The map: ${words(map)}`);
	if (folded.length) {
		const since = folded.reduce((a, f) => (f.observed && f.observed > a ? f.observed : a), '');
		lines.push(
			`   Once at this address, gone from the map since ${monthYear(since)}: ${gone(folded)}. One place: tell it once.`
		);
	}
	for (const source of [...new Set(elsewhere.map((f) => f.source))])
		lines.push(
			`   Elsewhere${allusion(source) ? `, kept by ${allusion(source)}` : ''}: ${others(elsewhere.filter((f) => f.source === source))}`
		);
	if (inscribed) lines.push('   Read the words on it as they are, not as hearsay.');
	for (const name of brokenNames(beat)) lines.push(`   Speak the name “${name}” exactly as found.`);
	if (beat.effects.includes('remembered')) {
		const asOf = beat.facts.find((f) => f.observed)?.observed;
		lines.push(`   Gone: recorded in ${monthYear(asOf)}, no longer on the map.`);
	}
	if (beat.effects.includes('self-correction')) {
		const was = oldNames(beat).map((o) => `Was called “${o.name}” in ${monthYear(o.asOf)}.`);
		lines.push(`   ${was.join(' ')} Correct yourself between the names.`);
	}
	if (beat.effects.includes('tense-slip')) {
		const observed = beat.facts.find((f) => f.observed && !isElsewhere(f))?.observed;
		lines.push(
			`   Out of date: last recorded in ${monthYear(observed)}. Slip between present and past.`
		);
	}
	return lines.join('\n');
}

export function buildPrompt(whole: Scene): Prompt {
	// What is kept out of prose is not in the prompt, so it changes no prose and no key.
	const scene = {
		...whole,
		beats: whole.beats
			.map((b) => ({ ...b, facts: b.facts.filter((f) => !keptOutOfProse(f.source)) }))
			.filter((b) => b.facts.length)
	};
	const street = streetTags(scene);
	const noticed = scene.beats.filter((b) => !isBackground(b) && !isHalf(b));
	const moods = MOODS[scene.mood];
	const mood = moods.length
		? moods[parseInt(hash(scene.stopId).slice(0, 8), 16) % moods.length]
		: '';
	const user = [
		'Where the reader stands:',
		[whereYouStand(scene, street), ...streetCharacter(street, true), setting(scene, false)]
			.filter(Boolean)
			.join(' '),
		'',
		noticed.length ? 'What you notice, nearest first:' : 'You notice nothing in particular.',
		...noticed.map((b, i) => beatLine(scene, b, i + 1)),
		'',
		...(mood ? [mood] : []),
		'Do not list the exits; the game prints them.'
	].join('\n');
	return { system: SYSTEM, user };
}

/** A stable key for a prompt: the same facts and prompt version give the same key. */
export function promptKey(prompt: Prompt): string {
	return `v${PROMPT_VERSION}-${hash(prompt.system + '\u0000' + prompt.user)}`;
}

/** Two 32-bit FNV-1a hashes with different seeds, as 16 hex characters. Not cryptographic. */
function hash(text: string): string {
	let a = 0x811c9dc5;
	let b = 0x01000193 ^ 0x5bd1e995;
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		a = Math.imul(a ^ c, 0x01000193);
		b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
	}
	return [a, b].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
