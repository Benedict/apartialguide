/** How many tests of each kind a tree has: unit tests (Vitest) and acceptance scenarios (Cucumber). */
export interface TestCount {
	unit: number;
	scenarios: number;
}

const KINDS: [keyof TestCount, string][] = [
	['unit', 'unit tests'],
	['scenarios', 'scenarios']
];

/** Each kind of test there are fewer of than on the base, said plainly; none, all is well. */
export function fewerTests(head: TestCount, base: TestCount): string[] {
	return KINDS.filter(([k]) => head[k] < base[k]).map(
		([k, said]) =>
			`${said}: ${head[k]}, against ${base[k]} on the base (${base[k] - head[k]} fewer)`
	);
}

/** The scenarios a Cucumber dry run would play, from its summary. */
export function scenarioCount(summary: string): number {
	const m = summary.match(/^(\d+) scenarios? \(/m);
	if (!m) throw new Error(`No count of scenarios in: ${summary.trim().slice(-200)}`);
	return Number(m[1]);
}

/** Lines that skip a test, leave it to do, or run one alone: a test is never got out of the way. */
export function disabledTests(source: string): string[] {
	return source
		.split('\n')
		.filter((line) => /^\s*(?:it|test|describe)\.(?:skip|todo|only)\(/.test(line))
		.map((line) => line.trim());
}
