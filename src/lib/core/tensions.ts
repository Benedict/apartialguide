import { groupBySubject, type Clock, type Fact } from './facts';

/** A condition in the data that the narration must answer to. */
export type Tension =
	| { kind: 'fragment'; subject: string; fact: Fact }
	| { kind: 'dated'; subject: string; observed: string }
	| { kind: 'sparse' }
	| { kind: 'dense' };

export interface TensionOptions {
	/** Observations older than this read as out of date. */
	staleAfterYears?: number;
	/** This many features or more in view crowd the narration. */
	denseFrom?: number;
}

export const NAME_KEY = /(^|[:_])name($|:)|^brand$|^operator$/;

/** A name that starts in lower case, or is a single character, looks broken off. */
export const looksBroken = (value: string) => /^\p{Ll}/u.test(value) || value.trim().length === 1;

/** A way tagged highway is a street. A node tagged highway (a bus stop, a crossing) is a feature. */
export const isStreet = (subjectFacts: readonly Fact[]) =>
	subjectFacts.some((f) => f.claim.key === 'highway' && f.subject.startsWith('way/'));

export function detectTensions(
	facts: readonly Fact[],
	clock: Clock,
	options: TensionOptions = {}
): Tension[] {
	const { staleAfterYears = 5, denseFrom = 8 } = options;
	const cutoff = yearsBefore(clock.today(), staleAfterYears);
	const tensions: Tension[] = [];
	let features = 0;

	for (const [subject, group] of groupBySubject(facts)) {
		for (const f of group) {
			if (NAME_KEY.test(f.claim.key) && looksBroken(f.claim.value)) {
				tensions.push({ kind: 'fragment', subject, fact: f });
			}
		}
		if (isStreet(group)) continue;
		features++;
		const observed = group.find((f) => f.observed)?.observed;
		if (observed && observed < cutoff) tensions.push({ kind: 'dated', subject, observed });
	}

	if (features === 0) tensions.push({ kind: 'sparse' });
	if (features >= denseFrom) tensions.push({ kind: 'dense' });
	return tensions;
}

function yearsBefore(date: string, years: number): string {
	return `${Number(date.slice(0, 4)) - years}${date.slice(4)}`;
}
