/**
 * What another keeps, given as hearsay: never as the map's, never as "another account". The same
 * words are always said the same way, so a world compiles alike every time.
 */
const LEADS = ['They say', 'It is said that', 'Someone wrote down that', 'Word is'];
const ASIDES = ['they say', 'it is said', 'someone wrote down'];

/** Any lead hearsay opens with, for those who check it. */
export const HEARSAY = /^(They say|It is said that|Someone wrote down that|Word is) /;

function pick<T>(choices: readonly T[], words: string): T {
	let h = 0;
	for (const c of words) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return choices[h % choices.length];
}

/** A clause as something said: "They say you have left Inventa West." */
export const hearsay = (clause: string): string => `${pick(LEADS, clause)} ${clause}.`;

/** Words to set within a sentence about the given words, as said: "“X”, they say". */
export const aside = (words: string): string => pick(ASIDES, words);
