import { groupBySubject, type Fact } from '../facts';
import { monthYear } from './words';

/** How many disruptions to tell at once: the nearest few. */
const NEAREST = 2;

/** "3 November", from a date and time as TfL gives it. */
const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${monthYear(iso).split(' ')[0]}`;

/**
 * Works and closures on the roads here, as hearsay: the nearest two, their words as found, and the
 * day each is to end. Nothing is said of who keeps the record.
 */
export function disruptionLines(facts: readonly Fact[]): string[] {
	const disruptions = [...groupBySubject(facts.filter((f) => f.source === 'TfL')).values()]
		.map((group) => Object.fromEntries(group.map((f) => [f.claim.key, f.claim.value])))
		.filter((d) => d.comments)
		.sort((a, b) => Number(a.metres) - Number(b.metres))
		.slice(0, NEAREST);
	return disruptions.map((d, i) => {
		const until = d.end ? `, until ${dayMonth(d.end)}` : '';
		const words = `“${d.comments.trim()}”${until}.`;
		return i === 0 ? `On the road here: ${words}` : `And: ${words}`;
	});
}
