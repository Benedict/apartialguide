import { groupBySubject, type Fact } from './facts';
import { isStreet, type Tension } from './tensions';

export type Effect = 'spoken-as-found' | 'tense-slip' | 'remembered' | 'self-correction';

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
	/** Features noticed, nearest first. */
	beats: Beat[];
	/** Features in view but not noticed, found only by looking closer. */
	hidden: Beat[];
	mood: 'plain' | 'hesitant' | 'rambling';
}

/** Land use and place labels: the setting, not things in it. */
export const isBackground = (beat: Beat) =>
	beat.facts.some((f) => f.claim.key === 'landuse' || f.claim.key === 'place');

/** Effects Guide always notices: a broken name, and what the map has lost or renamed. */
const ALWAYS_NOTICED = new Set<Effect>(['spoken-as-found', 'remembered', 'self-correction']);

/** Features noticed at a stop when nothing crowds the view, and when the view is crowded. */
const ATTENTION = { plain: 4, rambling: 2, hesitant: 4 };

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
			if (t.kind === 'gone') effects.add('remembered');
			if (t.kind === 'renamed') effects.add('self-correction');
		}
		beats.push({ subject, facts: group, effects: [...effects] });
	}

	// The land underfoot is always told and costs no attention. A broken name, and what the map
	// has lost or renamed, are always noticed.
	// Otherwise only the nearest few.
	let attention = ATTENTION[mood];
	const noticed = beats.filter((b) => {
		if (isBackground(b)) return true;
		const seen = attention > 0 || b.effects.some((e) => ALWAYS_NOTICED.has(e));
		attention--;
		return seen;
	});
	const hidden = beats.filter((b) => !noticed.includes(b));
	return { stopId, street, beats: noticed, hidden, mood };
}
