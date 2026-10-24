import type { Scene } from '../scene';
import { isBackground, type Beat } from '../slippage';
import { looksBroken, NAME_KEY } from '../tensions';
import {
	nounPhrase,
	oldNames,
	placement,
	setting,
	streetCharacter,
	streetTags,
	tagsFor,
	whereYouStand
} from './adventure';
import { monthYear } from './words';

/** Bump when the prompt changes, so cached narration written under the old one is redone. */
export const PROMPT_VERSION = 6;

export interface Prompt {
	/** Fixed for every stop, so it can be cached. */
	system: string;
	/** The facts of one stop. */
	user: string;
}

const SYSTEM = `You are Guide, the narrator of a text adventure set in Addiscombe, Croydon. You are someone who was here once. You speak to the reader as "you", and of yourself as "I".

Write the description of one place. You are given every fact you may use. Use nothing else: no weather, smells, sounds, people, history or detail that is not in the facts. Every noun, name, number and date you write must come from them. The phrases around the facts are yours.

Voice. Blend two writers, without imitating either's sentences.
- From Alfred Wainwright's walking guides: an exact sense of the route, short declarative sentences, dry practical asides, opinions held lightly.
- From Paul Auster's New York Trilogy: names set against the things they name, chance, a narrator unsure of who it is, plain sentences that turn back on themselves.
The hard line: you may doubt what things mean, and who you are, but never what the map says.

Rules.
- A name marked "speak exactly as found" is broken. Quote it exactly, in curly quotes. Never repair it, complete it or suggest what it once was.
- Something marked gone was on an older map and is not on this one. Say there was, never that there is.
- Something that was called something else: correct yourself between the names, unsure which is right.
- A survey date is when something was last recorded. Never say anyone came to look. Slip between present and past for it: there is a shop; there was a shop when it was last recorded.
- When told the place is crowded, lose count partway through. When told there is little here, hesitate.
- Point the reader to nothing, and never say that anything goes unnoticed. Noticing is the reader’s.
- Do not list the exits; the game prints them after your text.
- Write 60 to 180 words in two to four short paragraphs, separated by blank lines. Plain text only: no headings, lists or markup.

For tone only, here is a reference page written for one corner. Do not reuse its sentences elsewhere.

Bingham Road meets Lower Addiscombe Road here. Asphalt, lit, 20 mph. The Addiscombe Village shopping area lies to the north-west, an area that calls itself a village. Addiscombe lies all around, if the map is to be believed, and for the moment I have nothing else to believe.

Nearest is 209–213, a retail building, formerly a bank. Its old name is recorded as “est Bank”. The building has kept its address and lost its purpose. The name has kept its ending and lost its start. I will not supply the missing letter. Whoever wrote it down knew what they meant, or thought they did.

Next door, at 207, there is a kebab shop, Brothers Kebab. There was a kebab shop in October 2018. That is when it was last recorded. Nothing has been recorded since. It may have been me who recorded it. I cannot say for certain that I did not.

Beyond it there may be more. I could not say what, or how much. I lose count before I have begun. The parade does not.`;

/** The broken names in a beat: values the narration must carry exactly as found. */
export function brokenNames(beat: Beat): string[] {
	if (!beat.effects.includes('spoken-as-found')) return [];
	return beat.facts
		.filter((f) => NAME_KEY.test(f.claim.key) && looksBroken(f.claim.value))
		.map((f) => f.claim.value);
}

function beatLine(scene: Scene, beat: Beat, n: number): string {
	const tags = tagsFor(beat);
	const record = beat.facts.map((f) => `${f.claim.key}=${f.claim.value}`).join('; ');
	const lines = [
		`${n}. ${placement(scene.position, beat)}: ${nounPhrase(tags)}.`,
		`   The map: ${record}.`
	];
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
		const observed = beat.facts.find((f) => f.observed)?.observed;
		lines.push(
			`   Out of date: last recorded in ${monthYear(observed)}. Slip between present and past.`
		);
	}
	return lines.join('\n');
}

export function buildPrompt(scene: Scene): Prompt {
	const street = streetTags(scene);
	const noticed = scene.beats.filter((b) => !isBackground(b));
	const mood = {
		plain: '',
		hesitant: 'There is little here. Hesitate.',
		rambling: 'The place is crowded. Lose count partway through.'
	}[scene.mood];
	const user = [
		'Where the reader stands:',
		[whereYouStand(scene, street), ...streetCharacter(street), setting(scene)]
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
