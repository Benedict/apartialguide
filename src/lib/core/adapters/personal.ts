import type { SourceRecord } from './records';

/**
 * What another source keeps that concerns a person more than a place. Personal detail the walk
 * does not need is taken out where it is fetched (`server/sources/`), so it never reaches the
 * prose, the narration kept in the repository, or the page:
 * - a planning record keeps only its reference, address, description, decision and dates
 *   (`ALLOWED`), and a name in its description is taken out (`stripNames`);
 * - a house sale is kept only as its street's range (`server/sources/more.ts`, `priceRecords`);
 * - a company registered anywhere but at a shop, office or other premises the map has is not told
 *   (one at a home is usually its director's home).
 * Things a resident asks to have taken out are on the suppression list (`core/suppression.ts`).
 */
const TITLE = /\b(Mr|Mrs|Ms|Miss|Mx|Dr)\b\.?\s+/g;
/** "Applicant" then a name: a capital, then lower case, as found in a description's own words. */
const APPLICANT = /\b[Aa]pplicant\s*:?\s+(?=[A-Z][a-z])/g;
/** One word of a name: an initial, or a capitalised word. */
const NAME_WORD = /^(?:[A-Z]\.?|[A-Z][a-z'’-]+)(?=[\s,.;:)!?-]|$)/;
/** The word that joined a name to what was done, taken out with it. */
const JOINING = /\s*\b(?:for|by|from|on behalf of)\s*$/i;
/** The most words a name runs to, after its title: initials and names. */
const MOST_WORDS = 4;

/** Whether words name a person: a title before a name, or an applicant named. */
export const namesAPerson = (words: string) => stripNames(words).removed > 0;

/**
 * Words with every title-and-name taken out ("Rear extension for Mrs A Jones" → "Rear extension"),
 * and how many were. "Applicant" stays; the name after it goes. Words that name no one are as found.
 */
export function stripNames(words: string): { text: string; removed: number } {
	let text = words;
	let removed = 0;
	for (const pattern of [TITLE, APPLICANT]) {
		for (;;) {
			pattern.lastIndex = 0;
			let match: RegExpExecArray | null;
			let cut: { from: number; to: number } | undefined;
			while ((match = pattern.exec(text))) {
				const after = match.index + match[0].length;
				const end = nameEnd(text, after);
				if (end === after) continue;
				const title = pattern === TITLE;
				const from = title
					? match.index - (text.slice(0, match.index).match(JOINING)?.[0].length ?? 0)
					: after;
				cut = { from, to: end };
				break;
			}
			if (!cut) break;
			text = text.slice(0, cut.from) + text.slice(cut.to);
			removed++;
		}
	}
	if (!removed) return { text: words, removed };
	return {
		text: text
			.replace(/\s{2,}/g, ' ')
			.replace(/\s+([,.;:!?])/g, '$1')
			.replace(/^[\s,.;:-]+/, '')
			.replace(/[\s,;:-]+$/, '')
			.trim(),
		removed
	};
}

/** Where a name that starts at `from` ends: up to four initials or capitalised words. */
function nameEnd(text: string, from: number): number {
	let at = from;
	for (let n = 0; n < MOST_WORDS; n++) {
		const rest = text.slice(at);
		const word = rest.match(NAME_WORD)?.[0];
		if (!word) break;
		at += word.length;
		const gap = text.slice(at).match(/^\s+/)?.[0] ?? '';
		if (!NAME_WORD.test(text.slice(at + gap.length))) break;
		at += gap.length;
	}
	return at;
}

/** The only claims each source may carry to the prose and the page; a source not named keeps all. */
export const ALLOWED: Record<string, readonly string[]> = {
	// Reference (the record's id) and address are the record's own; these are its words.
	planning: ['application', 'decision', 'date']
};

/** A record's claims, only those its source is allowed. */
export const allowedClaims = (prefix: string, claims: Record<string, string>) =>
	ALLOWED[prefix]
		? Object.fromEntries(Object.entries(claims).filter(([k]) => ALLOWED[prefix].includes(k)))
		: claims;

const PREMISES_KEYS = ['shop', 'office', 'craft', 'amenity', 'healthcare', 'tourism', 'industrial'];
const PREMISES_BUILDINGS = new Set([
	'commercial',
	'retail',
	'office',
	'industrial',
	'warehouse',
	'supermarket',
	'kiosk'
]);

/** Whether the map has a thing as premises, not as a home. */
export const isPremises = (tags: Record<string, string> = {}) =>
	PREMISES_KEYS.some((k) => tags[k]) || PREMISES_BUILDINGS.has(tags.building ?? '');

/** Whether a record is left out as concerning a person, given the source and what the map has there. */
export function concernsAPerson(
	prefix: string,
	record: SourceRecord,
	thing?: { tags?: Record<string, string> }
): boolean {
	// A planning record that still names someone, taken before names were taken out where fetched.
	if (prefix === 'planning') return namesAPerson(record.claims.application ?? '');
	if (prefix === 'company') return !thing || !isPremises(thing.tags);
	return false;
}
