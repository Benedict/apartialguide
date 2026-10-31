import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { withCsp } from './csp';

const page = (head: string, body = '') =>
	`<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${head}\n</head>\n<body>${body}</body>\n</html>`;
const sha = (code: string) =>
	`'sha256-${createHash('sha256').update(code, 'utf8').digest('base64')}'`;
const policyOf = (html: string) =>
	html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)![1];

describe('withCsp', () => {
	it('puts the policy straight after the charset, before any script can run', () => {
		const html = withCsp(page('<script>var a = 1;</script>'));
		expect(html.indexOf('Content-Security-Policy')).toBeGreaterThan(html.indexOf('<meta charset'));
		expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script>'));
	});

	it('lets each script written in the page run by its hash, and no other', () => {
		const policy = policyOf(
			withCsp(page('<script>var a = 1;</script>', '<script>\nvar b = 2;\n</script>'))
		);
		const scripts = policy.split('; ').find((d) => d.startsWith('script-src '))!;
		expect(scripts).toContain(sha('var a = 1;'));
		expect(scripts).toContain(sha('\nvar b = 2;\n'));
		expect(scripts).not.toContain("'unsafe-inline'");
		expect(scripts).not.toContain("'unsafe-eval'");
	});

	it('leaves data blocks alone: JSON is never run', () => {
		const policy = policyOf(
			withCsp(
				page(
					'<script type="application/json" id="head">{"a":1}</script><script type="application/ld+json">{}</script>'
				)
			)
		);
		expect(policy).not.toContain(sha('{"a":1}'));
		expect(policy).not.toContain(sha('{}'));
	});

	it('names only the places the walk asks of, each where it is needed', () => {
		const policy = policyOf(withCsp(page('')));
		const directive = (name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `))!;
		expect(directive('default-src')).toBe("default-src 'self'");
		expect(directive('script-src')).toContain('https://cdn.jsdelivr.net');
		for (const host of [
			'https://api.open-meteo.com',
			'https://air-quality-api.open-meteo.com',
			'https://api.tfl.gov.uk',
			'https://celestrak.org',
			'https://tiles.openfreemap.org',
			'https://s3-eu-west-1.amazonaws.com'
		])
			expect(directive('connect-src')).toContain(host);
		expect(directive('worker-src')).toBe('worker-src blob:');
		expect(policy).toContain("object-src 'none'");
		expect(policy).toContain("base-uri 'none'");
		expect(policy).toContain("form-action 'self'");
	});

	it('names Google only on a page that counts visits, once a reader says yes', () => {
		expect(withCsp(page(''))).not.toMatch(/google/);
		const counted = policyOf(withCsp(page(''), { analytics: true }));
		expect(counted).toMatch(/script-src [^;]*https:\/\/www\.googletagmanager\.com/);
		expect(counted).toMatch(/connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
	});

	it('adds the flights function’s own site, when it is deployed elsewhere', () => {
		expect(policyOf(withCsp(page(''), { flightsUrl: 'https://flights.example.org/x' }))).toContain(
			'https://flights.example.org'
		);
		expect(policyOf(withCsp(page(''), { flightsUrl: '/api/flights' }))).not.toContain(
			'/api/flights'
		);
	});

	it('lets the page ask the news function where it is served from another site, and asks nothing new for one of its own', () => {
		const page = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
		expect(withCsp(page, { newsUrl: 'https://news.example.org/api/news' })).toContain(
			'https://news.example.org'
		);
		expect(withCsp(page, { newsUrl: '/api/news' })).not.toContain('gdeltproject');
	});
});
