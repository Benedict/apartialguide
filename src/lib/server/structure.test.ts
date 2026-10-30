import { describe, expect, it } from 'vitest';
import { structureFaults } from './structure';

const page = (body: string) =>
	`<!doctype html><html lang="en"><head></head><body>${body}</body></html>`;

describe('structureFaults', () => {
	it('passes a page with one h1, no skipped levels, a main and a skip link to it', () => {
		expect(
			structureFaults(
				page(
					'<a class="skip" href="#main">Skip</a><main id="main"><h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2></main>'
				)
			)
		).toEqual([]);
	});

	it('names each fault', () => {
		expect(structureFaults(page('<main><h2>A</h2><h4>B</h4></main>'))).toEqual([
			'headings start at h2, not h1',
			'not exactly one h1',
			'h2 is followed by h4',
			'no main landmark with an id',
			'no skip link first in the body'
		]);
		expect(
			structureFaults(
				page('<a class="skip" href="#nowhere">Skip</a><main id="main"><h1>A</h1></main>')
			)
		).toEqual(["the skip link's #nowhere is not on the page"]);
	});
});
