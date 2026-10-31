import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('contributions', () => {
	it('are under the GNU AGPL, version 3 or later, as the licence and the package say', () => {
		expect(read('LICENSE')).toMatch(
			/^GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007/
		);
		expect(JSON.parse(read('package.json')).license).toBe('AGPL-3.0-or-later');
	});

	it('leave Guide’s prose under CC BY-SA 4.0, as its folder, the guide and About say', () => {
		expect(read('data/narration/LICENSE.md')).toContain(
			'Creative Commons Attribution-ShareAlike 4.0'
		);
		expect(read('data/narration/LICENSE.md')).toContain(
			'https://creativecommons.org/licenses/by-sa/4.0/'
		);
		expect(read('CONTRIBUTING.md')).toContain('CC BY-SA 4.0');
	});

	it('are signed off under the Developer Certificate of Origin, which the repository carries', () => {
		expect(read('DCO')).toContain('Developer Certificate of Origin\nVersion 1.1');
		expect(read('CONTRIBUTING.md')).toContain('Signed-off-by:');
		expect(read('CONTRIBUTING.md')).toContain('git commit -s');
	});

	it('are checked for a sign-off on every commit of a pull request from a fork', () => {
		const dco = read('.github/workflows/dco.yml');
		expect(dco).toMatch(/^on:\s*\n\s+pull_request:/m);
		expect(dco).toContain('github.event.pull_request.head.repo.full_name != github.repository');
		expect(dco).toContain('Signed-off-by: ');
		expect(dco).toContain('--no-merges');
	});

	it('are routed: wrong data to its source, misread prose and new areas to an issue form each', () => {
		const guide = read('CONTRIBUTING.md');
		expect(guide).toContain('openstreetmap.org');
		expect(guide).toContain('Write the failing test');
		for (const form of ['guide-says.yml', 'source.yml', 'area.yml'])
			expect(existsSync(`.github/ISSUE_TEMPLATE/${form}`)).toBe(true);
		expect(existsSync('.github/pull_request_template.md')).toBe(true);
		expect(existsSync('CODE_OF_CONDUCT.md')).toBe(true);
		expect(existsSync('SECURITY.md')).toBe(true);
	});
});
