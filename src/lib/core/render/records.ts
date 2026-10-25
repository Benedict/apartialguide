import type { Tags } from '../osm';
import { monthYear } from './words';

/** What Guide says of each other source's facts about a thing. Nouns, numbers and dates are the source's. */
const SAYINGS: ((t: Tags) => string | undefined)[] = [
	(t) => {
		const rating = t['hygiene:rating'];
		if (!rating) return undefined;
		const given = t['hygiene:date'] ? `, given in ${monthYear(t['hygiene:date'])}` : '';
		return /^\d$/.test(rating)
			? `Its food hygiene rating is ${rating}${given}.`
			: `Its food hygiene rating: “${rating}”${given}.`;
	},
	(t) => {
		if (!t['listed:grade']) return undefined;
		const when = t['listed:listed'] ? `, in ${monthYear(t['listed:listed'])}` : '';
		return `Listed, grade ${t['listed:grade']}${when}.`;
	},
	(t) => {
		const plan = t['planning:application'];
		if (!plan) return undefined;
		const when = t['planning:date']
			? `In ${monthYear(t['planning:date'])}, an application`
			: 'An application';
		const decided = t['planning:decision'] ? ` It was “${t['planning:decision']}”.` : '';
		return `${when}: “${plan}”.${decided}`;
	},
	(t) => (t['plaque:inscription'] ? `A plaque: “${t['plaque:inscription']}”.` : undefined),
	(t) => {
		const sold = Number(t['price:sold']);
		if (!t['price:sold'] || !Number.isFinite(sold)) return undefined;
		const when = t['price:date'] ? ` in ${monthYear(t['price:date'])}` : '';
		return `Sold for £${sold.toLocaleString('en-GB')}${when}.`;
	},
	(t) =>
		t['crime:reports']
			? `In ${monthYear(`${t['crime:month']}-01`)}, ${t['crime:reports']} report${t['crime:reports'] === '1' ? '' : 's'} on or near it: ${t['crime:kinds']}.`
			: undefined
];

/** The sentences another account's facts give a thing, in a fixed order. */
export const recordSentences = (tags: Tags): string[] =>
	SAYINGS.map((say) => say(tags)).filter((s): s is string => !!s);
