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
	it('build the walk with the news function, as with flights, where Netlify serves it', () => {
		const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
		expect(deploy).toContain("NEWS_URL: ${{ vars.NETLIFY_SITE_ID != '' && '/api/news' || '' }}");
		const fn = readFileSync('netlify/edge-functions/news.ts', 'utf8');
		expect(fn).toContain("path: '/api/news'");
		expect(fn).toContain("cache: 'manual'");
		expect(fn).toContain('newsHandler');
	});

	it('build the walk with the feedback function where Netlify serves it, its token Netlify’s alone', () => {
		const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
		expect(deploy).toContain(
			"FEEDBACK_URL: ${{ vars.NETLIFY_SITE_ID != '' && '/api/feedback' || '' }}"
		);
		expect(deploy).not.toContain('FEEDBACK_TOKEN');
		const fn = readFileSync('netlify/edge-functions/feedback.ts', 'utf8');
		expect(fn).toContain("path: '/api/feedback'");
		expect(fn).toContain("Netlify.env.get('FEEDBACK_TOKEN')");
		expect(fn).toContain('feedbackHandler');
	});

	it('fetch only when the commit pushed edits their request, asking git, as a new branch’s push lists no files', () => {
		for (const [file, request] of [
			['records.yml', 'data/records/request.env'],
			['history.yml', 'data/history/request.env'],
			['wikidata.yml', 'data/wikidata/request.env'],
			['snapshot.yml', 'data/snapshots/request.env']
		]) {
			const text = readFileSync(`.github/workflows/${file}`, 'utf8');
			// A first job asks git what the commit itself changed; the fetch needs its answer.
			expect(text, file).toContain(`git diff --name-only HEAD~1 HEAD -- ${request}`);
			expect(text, file).toContain(
				"if: github.event_name == 'workflow_dispatch' || needs.asked.outputs.edited == 'true'"
			);
			expect(text, file).not.toContain('head_commit.modified');
		}
	});

	it('refuse to deploy a borough in which an open area has no door, as a door the map cannot find would send readers elsewhere', () => {
		const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
		expect(deploy).toMatch(/^\s+DOORS_REQUIRED: 1$/m);
		expect(readFileSync('scripts/export.ts', 'utf8')).toContain('process.env.DOORS_REQUIRED');
	});

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
