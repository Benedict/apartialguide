import { hearsay } from './hearsay';
import { article, numberWord } from './words';

/** A zone another account draws over the map, and what it says of it. */
export interface Zone {
	name: string;
	kind: string;
	claims?: Record<string, string>;
}

/** Kinds told only on coming onto them: a mine's ground, its returns, the rock beneath. */
const ONTO = new Set(['mine plans', 'mine returns', 'bedrock', 'superficial deposits']);
/** The most mines told in one step; the rest are counted. */
const MOST_MINES = 3;

/** A code from a fixed list, or a word set in capitals, read as a word: "Asbian to Yeadonian". */
const asWords = (text: string) => text.toLowerCase();
const asAges = (text: string) =>
	text.toLowerCase().replace(/\b(?!to\b|and\b|of\b)([a-z])/g, (c) => c.toUpperCase());

function plansOf(z: Zone): string {
	const c = z.claims ?? {};
	const n = Number(c.plans) || 1;
	const kind = c.kinds ?? 'plan';
	const drawn = n === 1 ? article(kind) : `${numberWord(n)} ${kind}s`;
	const what = c.minerals ? `, for ${asWords(c.minerals)}` : '';
	const ended = c.abandoned ? `, abandoned in ${c.abandoned}` : '';
	return hearsay(`this ground was drawn on ${drawn} of ${z.name}${what}${ended}`);
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
					c[`${y}.copper`] && `${c[`${y}.copper`]} of copper`,
					c[`${y}.pounds`] && `sold for £${c[`${y}.pounds`]}`
				]
					.filter(Boolean)
					.join(', ')
			: undefined;
		const given = [lead, copper].filter(Boolean).join('; and ');
		return hearsay(`of ${name}, the returns for ${y} give ${given}`);
	});
}

function rockOf(z: Zone): string {
	const c = z.claims ?? {};
	// A rock named for what it is (PEAT: peat) is said once.
	const rock = c.rock && asWords(c.rock) !== asWords(z.name) ? `: ${asWords(c.rock)}` : '';
	const age = c.age ? `, of the ${asAges(c.age)}` : '';
	return hearsay(`beneath you lies ${z.name}${rock}${age}`);
}

/**
 * What a step says of the zones another account draws: those come onto, and those left. A mine's
 * ground, its returns and the rock beneath are told only on coming onto them, three mines at most a
 * step; any other zone, such as a flood zone, on coming in and on coming out.
 */
export function zoneLines(entered: readonly Zone[], left: readonly Zone[]): string[] {
	const lines: string[] = [];
	const mines = entered.filter((z) => z.kind === 'mine plans');
	for (const z of mines.slice(0, MOST_MINES)) lines.push(plansOf(z));
	if (mines.length > MOST_MINES)
		lines.push(
			hearsay(`the ground was drawn for ${numberWord(mines.length - MOST_MINES)} mines more`)
		);
	for (const z of entered) {
		if (z.kind === 'mine returns') lines.push(...returnsOf(z));
		else if (z.kind === 'bedrock' || z.kind === 'superficial deposits') lines.push(rockOf(z));
		else if (!ONTO.has(z.kind)) lines.push(hearsay(`you are within ${z.name}, ${article(z.kind)}`));
	}
	for (const z of left)
		if (!ONTO.has(z.kind)) lines.push(hearsay(`you have come out of ${z.name}`));
	return lines;
}
