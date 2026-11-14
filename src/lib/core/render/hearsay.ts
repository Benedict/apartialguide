/**
 * What lies beyond the map, as others keep it: said once, plainly, as something said. Every other
 * account is told as the record it is, with its date, and needs no lead (CLAUDE.md, hard rules).
 */
export const HEARSAY = /^They say /;

/** A clause as something said: "They say a Roman road ran from London towards Brighton." */
export const hearsay = (clause: string): string => `They say ${clause}.`;

/**
 * The prompt's old hearsay, word for word: the records' sentences reach the prompt, and its key is
 * everything the prompt says, so they keep the leads they always had there, and stored prose keeps
 * its keys. The walk itself says them plainly. Drop these at the next full prose round.
 */
const KEPT_LEADS = ['They say', 'It is said that', 'Someone wrote down that', 'Word is'];
const KEPT_ASIDES = ['they say', 'it is said', 'someone wrote down'];
function pick<T>(choices: readonly T[], words: string): T {
	let h = 0;
	for (const c of words) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return choices[h % choices.length];
}
export const keptHearsay = (clause: string): string => `${pick(KEPT_LEADS, clause)} ${clause}.`;
export const keptAside = (words: string): string => pick(KEPT_ASIDES, words);
