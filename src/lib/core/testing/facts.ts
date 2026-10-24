import type { Fact } from '../facts';

/** Makes an invented fact for tests. */
export function fact(subject: string, key: string, value: string, extra: Partial<Fact> = {}): Fact {
	return {
		id: `test:${subject}:${key}`,
		subject,
		claim: { key, value },
		source: 'test',
		reach: 30,
		geometry: [[51.38, -0.07]],
		...extra
	};
}

/** Several facts about one subject, from a tag map. */
export const facts = (subject: string, tags: Record<string, string>, extra: Partial<Fact> = {}) =>
	Object.entries(tags).map(([k, v]) => fact(subject, k, v, extra));
