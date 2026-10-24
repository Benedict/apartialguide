import { groupBySubject, type Fact } from './facts';
import { isStreet, type Tension } from './tensions';

export type Effect = 'spoken-as-found' | 'tense-slip';

/** One thing the narrator notices, and how its telling should slip. */
export interface Beat {
	subject: string;
	facts: Fact[];
	effects: Effect[];
}

/** What to say at a stop, decided before any words are chosen. */
export interface NarrationPlan {
	stopId: string;
	/** Facts about the street or streets underfoot. */
	street: Fact[];
	/** Features in the order they are noticed. */
	beats: Beat[];
	mood: 'plain' | 'hesitant' | 'rambling';
}

/** Features noticed at a stop when nothing crowds the view. */
const ATTENTION = 4;

/**
 * Turns the tensions found at a stop into narrative effects.
 * `facts` arrive nearest first, so the narrator notices what is closest.
 */
export function chooseSlippage(
	stopId: string,
	facts: readonly Fact[],
	tensions: readonly Tension[]
): NarrationPlan {
	const has = (kind: Tension['kind']) => tensions.some((t) => t.kind === kind);
	const mood = has('sparse') ? 'hesitant' : has('dense') ? 'rambling' : 'plain';

	const street: Fact[] = [];
	const beats: Beat[] = [];
	for (const [subject, group] of groupBySubject(facts)) {
		if (isStreet(group)) {
			street.push(...group);
			continue;
		}
		const effects = new Set<Effect>();
		for (const t of tensions) {
			if (!('subject' in t) || t.subject !== subject) continue;
			if (t.kind === 'fragment') effects.add('spoken-as-found');
			if (t.kind === 'dated') effects.add('tense-slip');
		}
		beats.push({ subject, facts: group, effects: [...effects] });
	}

	return { stopId, street, beats: mood === 'rambling' ? beats : beats.slice(0, ATTENTION), mood };
}
