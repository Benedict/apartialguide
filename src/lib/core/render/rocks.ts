/**
 * The rocks in plain words. The geological map gives a rock's lithology and age in the
 * geologist's words ("ARGILLACEOUS ROCKS", "ASBIAN to YEADONIAN"); here they become a walker's:
 * the lithology by a small glossary, the age as the period it falls in and when that period was,
 * by the International Commission on Stratigraphy's chart (v2023/09), rounded to the million years.
 */

/** Each period, its start and end in millions of years ago, as the ICS chart gives them. */
const PERIODS: Record<string, [number, number]> = {
	Cambrian: [538.8, 485.4],
	Ordovician: [485.4, 443.8],
	Silurian: [443.8, 419.2],
	Devonian: [419.2, 358.9],
	Carboniferous: [358.9, 298.9],
	Permian: [298.9, 251.902],
	Triassic: [251.902, 201.4],
	Jurassic: [201.4, 145.0],
	Cretaceous: [145.0, 66.0],
	Paleogene: [66.0, 23.03],
	Neogene: [23.03, 2.58],
	Quaternary: [2.58, 0]
};

/** The British and international stages and series the map names, by the period each lies in. */
const STAGES: Record<string, string> = Object.fromEntries(
	Object.entries({
		Devonian: 'LOCHKOVIAN PRAGIAN EMSIAN EIFELIAN GIVETIAN FRASNIAN FAMENNIAN',
		Carboniferous:
			'COURCEYAN CHADIAN ARUNDIAN HOLKERIAN ASBIAN BRIGANTIAN PENDLEIAN ARNSBERGIAN CHOKIERIAN ALPORTIAN KINDERSCOUTIAN MARSDENIAN YEADONIAN LANGSETTIAN DUCKMANTIAN BOLSOVIAN ASTURIAN CANTABRIAN STEPHANIAN WESTPHALIAN NAMURIAN DINANTIAN SILESIAN VISEAN TOURNAISIAN MISSISSIPPIAN PENNSYLVANIAN',
		Permian: 'CISURALIAN GUADALUPIAN LOPINGIAN',
		Quaternary: 'PLEISTOCENE HOLOCENE DEVENSIAN FLANDRIAN ANGLIAN HOXNIAN WOLSTONIAN IPSWICHIAN'
	}).flatMap(([period, stages]) => stages.split(' ').map((s) => [s, period]))
);

/** The period a word of the map's age names: a period itself, or a stage within one. */
function periodOf(word: string): string | undefined {
	const upper = word.toUpperCase();
	const named = Object.keys(PERIODS).find((p) => p.toUpperCase() === upper);
	return named ?? STAGES[upper];
}

const years = (ma: number) => Math.round(ma);

/** When a rock was laid down, from the map's age, or nothing where the age names no period. */
export function laidDown(age: string): string | undefined {
	const periods = age
		.split(/\s+to\s+|[\s,]+/i)
		.map(periodOf)
		.filter((p): p is string => !!p);
	if (!periods.length) return undefined;
	const first = periods[0];
	const last = periods.at(-1)!;
	const [from] = PERIODS[first];
	const [, to] = PERIODS[last];
	// The last period, still going on: since its start, a figure of one decimal place.
	if (to === 0) return `in the ${first}, in the last ${from.toFixed(1)} million years`;
	if (first === last)
		return `in the ${first}, between ${years(from)} and ${years(to)} million years ago`;
	return `between the ${first} and the ${last}, ${years(from)} to ${years(to)} million years ago`;
}

/** The geologist's words for a rock, and a walker's. */
const GLOSSARY: [RegExp, string][] = [
	[/\s+with subordinate\s+/g, ', with some '],
	[/\bargillaceous rocks?\b/g, 'mudstone'],
	[/\barenaceous rocks?\b/g, 'sandstone'],
	[/\bdiamicton\b/g, 'boulder clay'],
	[/\bmafic igneous-rock\b/g, 'dark igneous rock'],
	[/\bfelsic igneous-rock\b/g, 'pale igneous rock'],
	[/\bigneous-rock\b/g, 'igneous rock']
];

/** What a rock is, in a walker's words: lower case, the glossary's words for the geologist's. */
export const rockWords = (rock: string) =>
	GLOSSARY.reduce((text, [from, to]) => text.replace(from, to), rock.toLowerCase());

const PERIOD_WORDS = new RegExp(`\\b(${Object.keys(PERIODS).join('|')})\\b`, 'gi');
const capitalise = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * A rock unit's name as said: a group or formation as a name ("the Yoredale Group"); anything
 * else as what it is, in lower case, its periods kept as names ("upper Devonian rocks").
 */
export function rockName(name: string): string {
	const lower = name.toLowerCase();
	if (/\b(group|supergroup|formation|member|suite|complex)\b/.test(lower))
		return `the ${lower.replace(/\b[a-z]/g, capitalise)}`;
	return lower.replace(PERIOD_WORDS, (p) => capitalise(p.toLowerCase()));
}
