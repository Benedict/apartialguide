/** A flat, unit or the like within a building: not a street. */
const WITHIN = /^(FLAT|UNIT|APARTMENT|APT|SUITE|ROOM|OFFICE|FLOOR|STUDIO|BLOCK)\b/i;

/**
 * A house number and street from address lines: the first line that starts with a number and goes
 * on to a street, or a number followed only by a flat, with the street on the next line.
 */
export function houseAndStreet(
	lines: readonly (string | undefined)[]
): { number: string; street: string } | undefined {
	const clean = lines.map((l) => l?.trim() ?? '');
	for (const [i, line] of clean.entries()) {
		const m = line.match(/^(\d+[A-Za-z]?)[,\s]+(.+)$/);
		if (!m) continue;
		if (!WITHIN.test(m[2])) return { number: m[1], street: m[2].trim() };
		const next = clean[i + 1];
		if (next && !/^\d/.test(next) && !WITHIN.test(next)) return { number: m[1], street: next };
	}
	return undefined;
}
