import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** The env a workflow sets for the world it builds, as KEY → value, from every step. */
function worldEnv(file: string): Record<string, string> {
	const text = readFileSync(`.github/workflows/${file}`, 'utf8');
	const keys = [
		'SNAPSHOT_PATH',
		'HISTORY_DIR',
		'WIKIDATA_DIR',
		'RECORDS_DIR',
		'START_AT',
		'NARRATION_PATH'
	];
	return Object.fromEntries(
		keys.flatMap((k) => {
			const m = text.match(new RegExp(`^\\s+${k}: (.+)$`, 'm'));
			return m ? [[k, m[1].trim()]] : [];
		})
	);
}

describe('the workflows', () => {
	it('publish the whole borough at the root, enriched area by area, with no walk of its own at /croydon/', () => {
		const pages = readFileSync('.github/workflows/deploy.yml', 'utf8');
		expect(worldEnv('deploy.yml').SNAPSHOT_PATH).toMatch(/^data\/snapshots\/croydon-.+\.json\.gz$/);
		expect(pages).not.toContain('site/croydon');
		expect(pages).not.toContain('CROYDON_WALK');
		// One area at a time: the Narrate workflow asks which, by its name in data/areas.json.
		const narrate = readFileSync('.github/workflows/narrate.yml', 'utf8');
		expect(narrate).toMatch(/^\s+area:$/m);
		expect(narrate).toContain('NARRATE_AREA: ${{ inputs.area }}');
	});

	it('fail CI when there are fewer tests than on the branch it would merge into', () => {
		const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
		expect(ci).toContain('git worktree add');
		expect(ci).toMatch(/^\s+TEST_COUNT_BASE: \S+$/m);
		expect(ci).toMatch(/^\s+npm run test:count$/m);
		expect(ci).toContain('github.base_ref');
		expect(ci).toContain('github.event.before');
	});

	it('write prose for the same world the published page plays', () => {
		// Prose is found by a key made from each stop's scene: a different world finds none of it.
		const narrate = worldEnv('narrate.yml');
		const pages = worldEnv('deploy.yml');
		expect(narrate).toEqual(pages);
		expect(pages.NARRATION_PATH).toBeTruthy();
	});

	it('publish the site in tiles, and check that it plays as served', () => {
		const pages = readFileSync('.github/workflows/deploy.yml', 'utf8');
		expect(pages).toMatch(/SITE_DIR: site\n[^]*?run: npm run export/);
		expect(pages).not.toContain('EXPORT_PATH');
		expect(pages).toMatch(/run: npm run smoke\n\s+env:\n\s+SITE_DIR: site/);
	});

	it('narrate only the busier stops unless asked for all', () => {
		const narrate = readFileSync('.github/workflows/narrate.yml', 'utf8');
		expect(narrate).toMatch(/only:\n[^]*?default: busier/);
		expect(narrate).toContain('NARRATE_ONLY: ${{ inputs.only }}');
	});

	it('publish with the Google Analytics measurement ID, a variable and not a secret', () => {
		expect(readFileSync('.github/workflows/deploy.yml', 'utf8')).toContain(
			'GA_MEASUREMENT_ID: ${{ vars.GA_MEASUREMENT_ID }}'
		);
	});

	it('publish the page again once prose is written', () => {
		expect(readFileSync('.github/workflows/narrate.yml', 'utf8')).toContain(
			'gh workflow run deploy.yml'
		);
	});
});
