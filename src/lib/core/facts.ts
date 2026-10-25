import type { LatLon } from './geo';

/**
 * The one form every source adapter returns. Nothing reaches the narration without one.
 */
export interface Fact {
	id: string;
	/** What the fact is about, as a stable reference such as `way/26605222`. */
	subject: string;
	claim: { key: string; value: string };
	source: string;
	/** When the claim was last observed, as YYYY-MM-DD. */
	observed?: string;
	/** Whether `observed` comes from a survey date or only from the last edit. */
	observedBy?: 'survey' | 'edit';
	/** How far from its geometry the fact can be perceived, in metres. */
	reach: number;
	geometry: LatLon[];
	/** Set on facts from another account than the map's, which Guide never gives as the map's. */
	elsewhere?: true;
}

export interface SourceAdapter {
	readonly name: string;
	facts(): Fact[];
}

export interface Clock {
	/** Today as YYYY-MM-DD. */
	today(): string;
}

export const fixedClock = (date: string): Clock => ({ today: () => date });

export function groupBySubject(facts: readonly Fact[]): Map<string, Fact[]> {
	const groups = new Map<string, Fact[]>();
	for (const f of facts) groups.set(f.subject, [...(groups.get(f.subject) ?? []), f]);
	return groups;
}
