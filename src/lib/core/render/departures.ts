import { groupBySubject, type Fact } from '../facts';

/** How many arrivals to say: the soonest few. */
const SOONEST = 3;

/**
 * "Invented Road: the 410 to Invented Palace in 3 minutes, the 289 to Invented End in 7.",
 * from TfL's arrivals. An answer with nothing due says so; no answer says nothing.
 */
export function departuresLine(facts: readonly Fact[], stop?: string): string | undefined {
	const arrivals = [...groupBySubject(facts.filter((f) => f.source === 'TfL')).values()]
		.map((group) => Object.fromEntries(group.map((f) => [f.claim.key, f.claim.value])))
		.sort((a, b) => Number(a.due) - Number(b.due))
		.slice(0, SOONEST);
	const name = arrivals[0]?.stop ?? stop;
	if (!name) return undefined;
	if (!arrivals.length) return `${name}: nothing is due.`;
	let unitSaid = false;
	const said = arrivals.map((a) => {
		const what = a.mode === 'tram' ? 'a tram' : `the ${a.line}`;
		const to = a.destination ? ` to ${a.destination}` : '';
		const minutes = Math.floor(Number(a.due) / 60);
		if (minutes < 1) return `${what}${to}, due now`;
		// The first time in minutes carries the unit; the rest are understood.
		const unit = unitSaid ? '' : ` minute${minutes === 1 ? '' : 's'}`;
		unitSaid = true;
		return `${what}${to} in ${minutes}${unit}`;
	});
	return `${name}: ${said.join(', ')}.`;
}
