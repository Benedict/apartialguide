/**
 * Counts the tests in this tree without running them, and with TEST_COUNT_BASE (another checkout,
 * such as the branch a pull request would merge into) fails if there are fewer of either kind here.
 * It fails too on any test skipped, left to do, or run alone.
 *   TEST_COUNT_BASE=../base npm run test:count
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
	disabledTests,
	fewerTests,
	scenarioCount,
	type TestCount
} from '../src/lib/server/testcount';

const here = process.cwd();

function count(dir: string): TestCount {
	const bin = (name: string) => join(here, 'node_modules', '.bin', name);
	const listed = join(mkdtempSync(join(tmpdir(), 'tests-')), 'list.json');
	execFileSync(bin('vitest'), ['list', `--json=${listed}`], { cwd: dir, stdio: 'ignore' });
	const summary = execFileSync(bin('cucumber-js'), ['--dry-run', '--format', 'summary'], {
		cwd: dir,
		env: { ...process.env, NODE_OPTIONS: '--import tsx' },
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore']
	});
	return {
		unit: JSON.parse(readFileSync(listed, 'utf8')).length,
		scenarios: scenarioCount(summary)
	};
}

function sources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sources(path);
		return /\.test\.ts$|\.steps\.ts$/.test(name) ? [path] : [];
	});
}

const faults = [...sources('src'), ...sources('features')].flatMap((path) =>
	disabledTests(readFileSync(path, 'utf8')).map((line) => `${path}: ${line}`)
);
const head = count(here);
console.log(`Here: ${head.unit} unit tests, ${head.scenarios} scenarios.`);
const baseDir = process.env.TEST_COUNT_BASE;
if (baseDir) {
	const base = count(resolve(baseDir));
	console.log(`Base: ${base.unit} unit tests, ${base.scenarios} scenarios.`);
	faults.push(...fewerTests(head, base));
}
if (faults.length) {
	console.error(`Fewer tests than there should be:\n  ${faults.join('\n  ')}`);
	process.exit(1);
}
