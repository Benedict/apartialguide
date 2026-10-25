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
	}
];

/** The sentences another account's facts give a thing, in a fixed order. */
export const recordSentences = (tags: Tags): string[] =>
	SAYINGS.map((say) => say(tags)).filter((s): s is string => !!s);
