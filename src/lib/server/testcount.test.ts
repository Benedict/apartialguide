import { describe, expect, it } from 'vitest';
import { disabledTests, fewerTests, scenarioCount } from './testcount';

describe('the test count guard', () => {
	it('finds no fault when every kind of test is as many or more than on the base', () => {
		expect(fewerTests({ unit: 640, scenarios: 75 }, { unit: 638, scenarios: 75 })).toEqual([]);
	});

	it('says which kind has fewer tests than on the base, and by how many', () => {
		expect(fewerTests({ unit: 500, scenarios: 76 }, { unit: 638, scenarios: 75 })).toEqual([
			'unit tests: 500, against 638 on the base (138 fewer)'
		]);
		expect(fewerTests({ unit: 638, scenarios: 70 }, { unit: 638, scenarios: 75 })).toEqual([
			'scenarios: 70, against 75 on the base (5 fewer)'
		]);
	});

	it('reads the scenarios a dry run would play', () => {
		expect(scenarioCount('\n75 scenarios (75 skipped)\n428 steps (428 skipped)\n')).toBe(75);
		expect(scenarioCount('1 scenario (1 skipped)')).toBe(1);
		expect(() => scenarioCount('nothing here')).toThrow();
	});

	it('finds a test skipped, left to do, or run alone', () => {
		const source = [
			"it('runs', () => {});",
			"it.skip('is skipped', () => {});",
			"describe.only('runs alone', () => {});",
			"test.todo('one day');",
			'expect(result.skipped).toBe(1);',
			'const quoted = "it.skip(\'only words\')";'
		].join('\n');
		expect(disabledTests(source)).toEqual([
			"it.skip('is skipped', () => {});",
			"describe.only('runs alone', () => {});",
			"test.todo('one day');"
		]);
	});
});
