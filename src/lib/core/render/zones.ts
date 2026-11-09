import { hearsay } from './hearsay';
import { laidDown, rockName, rockWords } from './rocks';
import { article, numberWord } from './words';

/** A zone another account draws over the map, and what it says of it. */
export interface Zone {
	name: string;
	kind: string;
	claims?: Record<string, string>;
}

/** Kinds told only on coming onto them: a mine's ground, its returns, the rock beneath. */
const ONTO = new Set(['mine plans', 'mine returns', 'bedrock', 'superficial deposits']);
/** Areas a register protects, told by name and kind on coming in and on coming out. */
const HERITAGE = new Set(['conservation area', 'scheduled monument', 'registered park and garden']);
/** The most mines told in one step; the rest are counted. */
const MOST_MINES = 3;

/** A code from a fixed list, or a word set in capitals, read as a word: lead, zinc. */
const asWords = (text: string) => text.toLowerCase();

const SMALL = new Set(['and', 'of', 'the', 'or', 'in', 'at', 'on']);
/**
 * A name the index sets all in capitals, as it sets every name, in the case it would be written:
 * "KILLHOPEHEAD, KILLHOPE PARK" is “Killhopehead, Killhope Park”. A name in mixed case is as found.
 */
const asWritten = (name: string) =>
	name === name.toUpperCase()
		? name
				.toLowerCase()
				.replace(/[\p{L}'’]+/gu, (w, at: number) =>
					at > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
				)
		: name;

/** One mine's plans: how many, of which mine, worked for what, when last abandoned. */
function planOf(z: Zone): string {
	const c = z.claims ?? {};
	const n = Number(c.plans) || 1;
	const worked = c.minerals ? `, worked for ${asWords(c.minerals)}` : '';
	const ended = c.abandoned ? `, abandoned in ${c.abandoned}` : '';
	return `${numberWord(n)} of “${asWritten(z.name)}”${worked}${ended}`;
}

/** The mines whose plans cover the ground, in one sentence, and how many more. */
const wordsIn = (z: Zone) => z.name.split(/\s+/).length;

function plansOf(found: readonly Zone[]): string {
	// Single mines first: a title that runs several mines together goes to the count.
	const mines = [...found].sort((a, b) => wordsIn(a) - wordsIn(b));
	const told = mines.slice(0, MOST_MINES).map(planOf);
	const list = told.length > 1 ? `${told.slice(0, -1).join('; ')}; and ${told.at(-1)}` : told[0];
	const more =
		mines.length > MOST_MINES
			? ` Plans of ${numberWord(mines.length - MOST_MINES)} more ${mines.length - MOST_MINES === 1 ? 'mine' : 'mines'} cover it too.`
			: '';
	return `The plans of old mines cover this ground: ${list}.${more}`;
}

const returnsOf = (z: Zone): string[] => returnsSaid(z.name, z.claims ?? {});

/** What a mine raised, year by year, as the returns give it: claims keyed `1871.ore` and so on. */
export function returnsSaid(name: string, c: Record<string, string>): string[] {
	const years = [
		...new Set(
			Object.keys(c)
				.filter((k) => /^\d{4}\./.test(k))
				.map((k) => k.split('.')[0])
		)
	].sort();
	return years.map((y) => {
		const parts = [
			c[`${y}.ore`] && `${c[`${y}.ore`]} of lead ore`,
			c[`${y}.lead`] && `${c[`${y}.lead`]} of lead`,
			c[`${y}.silver`] && `${c[`${y}.silver`]} ounces of silver`
		].filter((p): p is string => !!p);
		const lead =
			parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
		// Copper sold at the ticketings: its ore, the fine copper in it, what it sold for.
		const copper = c[`${y}.copper ore`]
			? [
					`${c[`${y}.copper ore`]} of copper ore`,
					c[`${y}.copper`] && `holding ${c[`${y}.copper`]} of copper`,
					c[`${y}.pounds`] && `sold for £${c[`${y}.pounds`]}`
				]
					.filter(Boolean)
					.join(', ')
			: undefined;
		const given = [lead, copper].filter(Boolean).join('; and ');
		return `What “${asWritten(name)}” raised in ${y}, by the returns: ${given}.`;
	});
}

function rockOf(z: Zone): string {
	const c = z.claims ?? {};
	const name = rockName(z.name);
	// A rock named for what it is (PEAT: peat) is said once.
	const what = c.rock && rockWords(c.rock) !== z.name.toLowerCase() ? `: ${rockWords(c.rock)}` : '';
	const when = c.age ? laidDown(c.age) : undefined;
	return `Under your feet, the map of the rocks shows ${name}${what}${when ? `, laid down ${when}` : ''}.`;
}

/**
 * What a step says of the zones another account draws: those come onto, and those left. A mine's
 * ground, its returns and the rock beneath are told only on coming onto them, three mines at most a
 * step; any other zone, such as a flood zone, on coming in and on coming out.
 */
/** A heritage area by its name, its kind where the name does not say it, and its grade. */
function heritageOf(z: Zone): string {
	const name = asWritten(z.name);
	const kind = name.toLowerCase().includes(z.kind) ? '' : `, ${article(z.kind)}`;
	const grade = z.claims?.grade ? `, grade ${z.claims.grade}` : '';
	return `“${name}”${kind}${grade}`;
}

export function zoneLines(entered: readonly Zone[], left: readonly Zone[]): string[] {
	const lines: string[] = [];
	const mines = entered.filter((z) => z.kind === 'mine plans');
	if (mines.length) lines.push(plansOf(mines));
	for (const z of entered) {
		if (z.kind === 'mine returns') lines.push(...returnsOf(z));
		else if (z.kind === 'bedrock' || z.kind === 'superficial deposits') lines.push(rockOf(z));
		else if (HERITAGE.has(z.kind)) lines.push(hearsay(`you are within ${heritageOf(z)}`));
		else if (!ONTO.has(z.kind)) lines.push(hearsay(`you are within ${z.name}, ${article(z.kind)}`));
	}
	for (const z of left)
		if (HERITAGE.has(z.kind)) lines.push(hearsay(`you have come out of ${heritageOf(z)}`));
		else if (!ONTO.has(z.kind)) lines.push(hearsay(`you have come out of ${z.name}`));
	return lines;
}
