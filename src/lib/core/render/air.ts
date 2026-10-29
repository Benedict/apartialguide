import type { Fact } from '../facts';

/** The European air quality index's own bands, upper bounds first to last. */
const BANDS: [number, string][] = [
	[20, 'good'],
	[40, 'fair'],
	[60, 'moderate'],
	[80, 'poor'],
	[100, 'very poor'],
	[Infinity, 'extremely poor']
];

/** "The air: fair, 32 on the European index.", from the facts about the air now, or nothing. */
export function airNow(facts: readonly Fact[]): string | undefined {
	const index = facts.find((f) => f.subject === 'air/now' && f.claim.key === 'air:index');
	if (!index) return undefined;
	const n = Number(index.claim.value);
	const band = BANDS.find(([upTo]) => n <= upTo)![1];
	return `The air: ${band}, ${index.claim.value} on the European index.`;
}
