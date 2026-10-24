import { groupBySubject, type Fact } from '../facts';
import type { Tags } from '../osm';
import type { Beat, NarrationPlan } from '../slippage';
import type { Renderer } from './renderer';

/**
 * Renders a plan from fixed phrases. A stand-in for the model, kept for tests and for running
 * without one. Every noun it uses comes from a fact; the phrases around them are Guide's.
 */
export class TemplateRenderer implements Renderer {
	render(plan: NarrationPlan): string {
		const paragraphs = [streetParagraph(plan.street), ...plan.beats.map(beatSentence)];
		if (plan.mood === 'hesitant') paragraphs.push(pick(plan.stopId, HESITATIONS));
		if (plan.mood === 'rambling') paragraphs.push(pick(plan.stopId, LOST_THREADS));
		return paragraphs.filter(Boolean).join('\n\n');
	}
}

const HESITATIONS = [
	'Beyond that… nothing I can put a name to.',
	'There’s — no. Nothing else. Nothing else here.',
	'I had thought there was more along here — apparently not. Apparently not.'
];

const LOST_THREADS = ['And — where was I.', 'And so on, and so on. Where was I.'];

function streetParagraph(street: readonly Fact[]): string {
	const [primary, ...others] = [...groupBySubject(street).values()].map(tagsOf);
	if (!primary) return '';
	const sentences = [
		primary.name ? `${primary.name}.` : `An unnamed ${humanise(primary.highway)}.`
	];
	if (primary.surface) sentences.push(`${capitalise(humanise(primary.surface))} underfoot.`);
	if (primary.lit === 'yes') sentences.push('Lit at night.');
	if (primary.lit === 'no') sentences.push('Unlit.');
	if (primary.maxspeed) sentences.push(`${primary.maxspeed}, for what that is worth.`);
	if (primary.sidewalk)
		sentences.push(SIDEWALKS[primary.sidewalk] ?? `Pavement: ${primary.sidewalk}.`);
	const crossing = [...new Set(others.map((t) => t.name).filter((n) => n && n !== primary.name))];
	if (crossing.length) sentences.push(`Here it meets ${list(crossing)}.`);
	return sentences.join(' ');
}

const SIDEWALKS: Record<string, string> = {
	both: 'Pavement on both sides.',
	left: 'Pavement on one side only.',
	right: 'Pavement on one side only.',
	separate: 'The pavement goes its own way.',
	no: 'No pavement. Mind yourself.'
};

function beatSentence(beat: Beat): string {
	const tags = tagsOf(beat.facts);
	const noun = currentUse(tags);
	const past = pastUse(tags);
	const where = address(tags);
	const at = where ? ` at ${where}` : '';
	const sentences: string[] = [];

	if (noun && beat.effects.includes('tense-slip')) {
		const observed = beat.facts.find((f) => f.observed)?.observed;
		sentences.push(
			`There’s ${article(noun)}${at}. There was ${article(noun)}${at}, in ${monthYear(observed)}, the last time anyone looked.`
		);
	} else if (noun) {
		sentences.push(`${capitalise(article(noun))}${at}${tags.name ? ` — “${tags.name}”` : ''}.`);
	} else if (!past) {
		sentences.push(
			`${capitalise(article(tags.building === 'yes' || !tags.building ? 'building' : humanise(tags.building)))}${at}.`
		);
	}
	if (tags.name && !noun) sentences.push(`“${tags.name}”, it says.`);
	if (past) sentences.push(`${where && !noun ? `${where}: it` : 'It'} was ${article(past)}.`);
	if (tags.old_name) sentences.push(`Once “${tags.old_name}”.`);
	if (beat.effects.includes('spoken-as-found'))
		sentences.push('That is the whole of it, as written.');
	return sentences.join(' ');
}

const USE_KEYS = [
	'shop',
	'amenity',
	'craft',
	'office',
	'leisure',
	'tourism',
	'healthcare',
	'historic'
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

function currentUse(tags: Tags): string | undefined {
	const key = USE_KEYS.find((k) => tags[k]);
	return key ? useNoun(key, tags[key]) : undefined;
}

function pastUse(tags: Tags): string | undefined {
	for (const prefix of LIFECYCLE) {
		const key = USE_KEYS.find((k) => tags[`${prefix}:${k}`]);
		if (key) return useNoun(key, tags[`${prefix}:${key}`]);
	}
	return undefined;
}

function useNoun(key: string, value: string): string {
	if (value === 'yes') return key;
	if (key === 'shop' && !SHOP_NOUNS.has(value)) return `${humanise(value)} shop`;
	if (key === 'office') return `${humanise(value)} office`;
	return humanise(value);
}

function address(tags: Tags): string | undefined {
	const number = tags['addr:housenumber'] ?? tags['addr:housename'];
	return [number, tags['addr:street']].filter(Boolean).join(' ') || undefined;
}

const tagsOf = (facts: readonly Fact[]): Tags =>
	Object.fromEntries(facts.map((f) => [f.claim.key, f.claim.value]));
const humanise = (value = 'way') => value.replace(/_/g, ' ');
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (noun: string) => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
const list = (items: string[]) =>
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
const monthYear = (date?: string) =>
	date ? `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}` : 'some year';

/** A stable choice for a stop, so the same stop reads the same way each time. */
function pick<T>(seed: string, options: readonly T[]): T {
	let h = 0;
	for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
	return options[Math.abs(h) % options.length];
}
