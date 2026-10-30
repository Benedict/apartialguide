import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('the site on Netlify', () => {
	const toml = read('netlify.toml');
	const deploy = read('.github/workflows/deploy.yml');

	it('has a page for a path the site does not have, written with the site', () => {
		const exporter = read('scripts/export.ts');
		expect(exporter).toContain("writeFileSync(join(site, '404.html'), notFoundPage())");
	});

	it('copies the brand’s pictures into the site, and names the site’s address for the preview image', () => {
		const exporter = read('scripts/export.ts');
		expect(exporter).toContain("'apple-touch-icon.png'");
		expect(exporter).toContain("'og.png'");
		expect(deploy).toContain('SITE_URL: ${{ vars.SITE_URL }}');
	});

	it('copies the fonts and their licence into the site', () => {
		const exporter = read('scripts/export.ts');
		expect(exporter).toContain('FONT_FILES');
		expect(exporter).toContain("join(site, 'fonts'");
	});

	it('builds a preview of a pull request only when it is labelled preview', () => {
		expect(deploy).toMatch(/pull_request:\n\s+types: \[opened, synchronize, reopened, labeled\]/);
		expect(deploy).toContain("contains(github.event.pull_request.labels.*.name, 'preview')");
	});

	it('publishes the site the workflow builds, with no build of its own', () => {
		expect(toml).toMatch(/^\[build\]\n\s+publish = "site"/m);
		expect(toml).not.toMatch(/^\s+command =/m);
	});

	it('keeps a walk behind a flag out of search engines by header as well', () => {
		expect(toml).toMatch(
			/for = "\/croydon\/\*"\n\s+\[headers.values\]\n\s+X-Robots-Tag = "noindex"/
		);
	});

	it('answers flights from the same site, as an Edge Function, with the shared handler', () => {
		const fn = read('netlify/edge-functions/flights.ts');
		expect(fn).toContain("from '../../src/lib/server/flights.ts'");
		expect(fn).toContain("path: '/api/flights'");
		expect(deploy).toContain("vars.NETLIFY_SITE_ID != '' && '/api/flights'");
	});

	it('builds and smokes the site in Actions before anything is deployed', () => {
		const smoke = deploy.indexOf('npm run smoke');
		expect(smoke).toBeGreaterThan(0);
		expect(deploy.indexOf('netlify-cli')).toBeGreaterThan(smoke);
	});

	it('deploys main to production and each pull request to a preview, only once Netlify is set up', () => {
		expect(deploy).toMatch(/netlify-cli@\d+\.\d+\.\d+ deploy/);
		// The folder as built and smoked: Netlify's own build would find the framework and run it.
		expect(deploy).toMatch(/netlify-cli@\S+ deploy --no-build /);
		expect(deploy).toContain("github.ref == 'refs/heads/main' && '--prod'");
		expect(deploy).toContain('--alias');
		expect(deploy).toContain("vars.NETLIFY_SITE_ID != ''");
		expect(deploy).toContain('NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}');
		expect(deploy).toContain('pull_request:');
	});

	it('keeps publishing to GitHub Pages from main until Netlify is set up, and then stops', () => {
		expect(existsSync('.github/workflows/pages.yml')).toBe(false);
		expect(deploy).toContain("vars.NETLIFY_SITE_ID == ''");
		expect(deploy).toContain('actions/deploy-pages');
	});
});
