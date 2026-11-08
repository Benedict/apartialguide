import type { Fact } from '../facts';
import type { Tags } from '../osm';

/** Words for things found in the map. Every noun here is made from a tag value. */

const USE_KEYS = [
	'shop',
	'amenity',
	'craft',
	'office',
	'leisure',
	'tourism',
	'healthcare',
	'historic',
	'highway'
];
const LIFECYCLE = ['disused', 'was', 'abandoned', 'demolished', 'razed'];

/** Shop values that are already nouns. Anything else gets "shop" after it. */
const SHOP_NOUNS = new Set([
	'bakery',
	'butcher',
	'chemist',
	'florist',
	'greengrocer',
	'hairdresser',
	'jeweller',
	'kiosk',
	'laundry',
	'newsagent',
	'optician',
	'supermarket',
	'tailor',
	'bookmaker',
	'pawnbroker'
]);

/** What `historic` says when it says only that a thing is old, in a walker's word. */
const HISTORIC_ONLY: Record<string, string> = {
	yes: 'historic site',
	industrial: 'industrial site',
	ruins: 'ruin'
};
/** Keys that say what a thing is, which say more than that it is historic. */
const WHAT_IT_IS = ['man_made', 'railway', 'power', 'barrier', 'natural'];

/** What the map's information point is, by the kind it gives. */
const INFORMATION: Record<string, string> = {
	board: 'information board',
	map: 'information map',
	office: 'information office'
};

/**
 * What a thing is used for. In a walker's words (`walker`) a value that is an adjective or the map's
 * shorthand is made a noun; as mapped, for the prompt, it stays as it was, so stored prose keeps its key.
 */
export function currentUse(tags: Tags, walker = true): string | undefined {
	const key = USE_KEYS.find((k) => tags[k]);
	if (!key) return undefined;
	const value = tags[key];
	if (!walker) return useNoun(key, value);
	if (key === 'historic' && HISTORIC_ONLY[value]) {
		// A chimney that is historic is told as a chimney.
		if (WHAT_IT_IS.some((k) => tags[k])) return undefined;
		return HISTORIC_ONLY[value];
	}
	if (key === 'tourism' && value === 'information')
		return tags.information
			? (INFORMATION[tags.information] ?? humanise(tags.information))
			: 'information point';
	return useNoun(key, value);
}

export function pastUse(tags: Tags): string | undefined {
	for (const prefix of LIFECYCLE) {
		const key = USE_KEYS.find((k) => tags[`${prefix}:${k}`]);
		if (key) return useNoun(key, tags[`${prefix}:${key}`]);
	}
	return undefined;
}

/** Amenity values that are adjectives on their own. */
const AMENITY_NOUNS: Record<string, string> = {
	fast_food: 'fast food place',
	ice_cream: 'ice cream shop'
};

function useNoun(key: string, value: string): string {
	if (value === 'yes') return key;
	if (key === 'shop' && !SHOP_NOUNS.has(value)) return `${humanise(value)} shop`;
	if (key === 'office') return `${humanise(value)} office`;
	return AMENITY_NOUNS[value] ?? humanise(value);
}

export function address(tags: Tags): string | undefined {
	const number = tags['addr:housenumber'] ?? tags['addr:housename'];
	return [number, tags['addr:street']].filter(Boolean).join(' ') || undefined;
}

export const tagsOf = (facts: readonly Fact[]): Tags =>
	Object.fromEntries(facts.map((f) => [f.claim.key, f.claim.value]));
export const humanise = (value = 'way') => value.replace(/_/g, ' ');
export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Things counted by amount, not one by one, which take no article. */
const UNCOUNTABLE = new Set([
	'bicycle parking',
	'drinking water',
	'recycling',
	'parking',
	'motorcycle parking',
	'something'
]);
/** Uncountable in a walker's words only: the prompt keeps the article it always had. */
const UNCOUNTABLE_TO_WALKERS = new Set([
	'water',
	'scrub',
	'grassland',
	'bare rock',
	'scree',
	'shingle',
	'sand',
	'mud',
	'outdoor seating'
]);
export const article = (noun: string, walker = true) =>
	UNCOUNTABLE.has(noun) || (walker && UNCOUNTABLE_TO_WALKERS.has(noun))
		? noun
		: `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
export const list = (items: string[]) =>
	items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];
export const monthYear = (date?: string) =>
	date ? `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}` : 'some year';

/** A date as "24 October 2026". */
export const longDate = (date: string) => `${Number(date.slice(8, 10))} ${monthYear(date)}`;

/** A stable choice for a stop, so the same stop reads the same way each time. */
export function pick<T>(seed: string, options: readonly T[]): T {
	let h = 0;
	for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
	return options[Math.abs(h) % options.length];
}

const NUMBERS = [
	'no',
	'one',
	'two',
	'three',
	'four',
	'five',
	'six',
	'seven',
	'eight',
	'nine',
	'ten'
];

/** "nine", or 12 above ten. */
export const numberWord = (n: number) => NUMBERS[n] ?? n.toLocaleString('en-GB');

/** "two residential areas", "three bicycle parking" */
export function counted(n: number, noun: string): string {
	if (n === 1) return article(noun);
	const number = NUMBERS[n] ?? String(n);
	if (UNCOUNTABLE.has(noun)) return `${number} lots of ${noun}`;
	const plural = /(s|sh|ch|x)$/.test(noun)
		? `${noun}es`
		: /[^aeiou]y$/.test(noun)
			? `${noun.slice(0, -1)}ies`
			: `${noun}s`;
	return `${number} ${plural}`;
}

/** A distance as said aloud: "40 metres", "1.2 km". */
export function distanceWords(metres: number): string {
	if (metres < 1000) return `${Math.round(metres / 10) * 10} metres`;
	const km = Math.round(metres / 100) / 10;
	return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}
