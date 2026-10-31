import type { Tags } from '../osm';
import { aside, hearsay } from './hearsay';
import { list as listOf, monthYear, numberWord } from './words';

/** What Guide says of each other source's facts about a thing. Nouns, numbers and dates are the source's. */
/** A quotation as found, closing the sentence itself when it ends with its own full stop. */
export const quoted = (text: string) => (/[.!?]$/.test(text.trim()) ? `“${text}”` : `“${text}”.`);

/**
 * The inspectors' codes for a rating that is not a number (`AwaitingInspection`, `Exempt`), read
 * as the words they are made of. A code is a value from a fixed list, not something someone wrote,
 * so reading it is not repairing it.
 */
const codeWords = (code: string) =>
	code
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.trim();

/** Each saying, and whether it is short enough to tell in a room rather than on a closer look. */
const SAYINGS: [boolean, (t: Tags) => string | undefined][] = [
	[
		true,
		(t) => {
			const rating = t['hygiene:rating'];
			if (!rating) return undefined;
			const given = t['hygiene:date'] ? `, given in ${monthYear(t['hygiene:date'])}` : '';
			return /^\d$/.test(rating)
				? `Its food hygiene rating is ${rating}${given}.`
				: `Its food hygiene rating: ${codeWords(rating)}${given}.`;
		}
	],
	[
		true,
		(t) => {
			if (!t['listed:grade']) return undefined;
			const when = t['listed:listed'] ? `, in ${monthYear(t['listed:listed'])}` : '';
			return `Listed, grade ${t['listed:grade']}${when}.`;
		}
	],
	[
		false,
		(t) => {
			const plan = t['planning:application'];
			if (!plan) return undefined;
			const when = t['planning:date']
				? `In ${monthYear(t['planning:date'])}, an application`
				: 'An application';
			const decided = t['planning:decision'] ? ` It was “${t['planning:decision']}”.` : '';
			return `${when}: ${quoted(plan)}${decided}`;
		}
	],
	[
		true,
		(t) => (t['plaque:inscription'] ? `A plaque: ${quoted(t['plaque:inscription'])}` : undefined)
	],
	[true, (t) => (t['bench:inscription'] ? `On it: ${quoted(t['bench:inscription'])}` : undefined)],
	[
		false,
		(t) => {
			const when = t['epc:lodged'] ? ` in ${monthYear(t['epc:lodged'])}` : '';
			const rated = t['epc:rating'] ? `rated ${t['epc:rating']} for energy${when}` : '';
			if (t['epc:built'])
				return hearsay(`it was built ${t['epc:built']}${rated ? `, and ${rated}` : ''}`);
			return rated ? hearsay(`it was ${rated}`) : undefined;
		}
	],
	[
		true,
		(t) => (t['geograph:taken'] ? `Taken in ${monthYear(`${t['geograph:taken']}-01`)}.` : undefined)
	],
	[
		true,
		(t) =>
			t['wildlife:seen'] ? `Seen here in ${monthYear(`${t['wildlife:seen']}-01`)}.` : undefined
	],
	[
		true,
		(t) =>
			t['postcode:ended']
				? `In use ${t['postcode:began'] ? `from ${monthYear(`${t['postcode:began']}-01`)} ` : ''}to ${monthYear(`${t['postcode:ended']}-01`)}.`
				: undefined
	],
	[
		false,
		(t) => {
			const count = Number(t['company:count']);
			if (!count) return undefined;
			const names = (t['company:names'] ?? '')
				.split('|')
				.filter(Boolean)
				.map((n) => `“${n}”`);
			const since = t['company:since'] ? monthYear(t['company:since']) : undefined;
			if (count === 1)
				return hearsay(
					`a company is registered here: ${names[0]}${since ? `, since ${since}` : ''}`
				);
			const shown = names.length < count ? `${names.join(', ')} and others` : listOf(names);
			return hearsay(
				`${numberWord(count)} companies are registered here${since ? `, the first since ${since}` : ''}: ${shown}`
			);
		}
	],
	[
		false,
		(t) => {
			const sold = Number(t['price:sold']);
			if (!t['price:sold'] || !Number.isFinite(sold)) return undefined;
			const when = t['price:date'] ? ` in ${monthYear(t['price:date'])}` : '';
			return `Sold for £${sold.toLocaleString('en-GB')}${when}.`;
		}
	],
	[
		false,
		(t) =>
			t['crime:reports']
				? `In ${monthYear(`${t['crime:month']}-01`)}, ${t['crime:reports']} report${t['crime:reports'] === '1' ? '' : 's'} on or near it: ${t['crime:kinds']}.`
				: undefined
	],
	[
		false,
		(t) =>
			t['trees:count']
				? ((along) => `${along}, ${aside(along)}: ${t['trees:kinds']}.`)(
						`${t['trees:count']} tree${t['trees:count'] === '1' ? '' : 's'} along it`
					)
				: undefined
	]
];

/** The sentences other accounts give a thing, in a fixed order: in a room, only the short ones. */
export const recordSentences = (tags: Tags, where: 'room' | 'closer' = 'closer'): string[] =>
	SAYINGS.filter(([short]) => short || where === 'closer')
		.map(([, say]) => say(tags))
		.filter((s): s is string => !!s);
