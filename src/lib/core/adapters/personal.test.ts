import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { namesAPerson, stripNames } from './personal';

describe('stripNames', () => {
	it('takes out a title and the name after it, with the word that joined it', () => {
		expect(stripNames('Rear extension for Mrs A Jones')).toEqual({
			text: 'Rear extension',
			removed: 1
		});
		expect(stripNames('Works on behalf of Mr J. Inventa to the front wall').text).toBe(
			'Works to the front wall'
		);
		expect(stripNames('Dr Ada Inventa: new porch').text).toBe('new porch');
	});

	it('takes out a name after "Applicant", keeping the word', () => {
		expect(stripNames('NOTE:- Applicant Mr Invented Person is the owner.').text).toBe(
			'NOTE:- Applicant is the owner.'
		);
		expect(stripNames('Applicant Ada Inventa to vary condition 2').text).toBe(
			'Applicant to vary condition 2'
		);
	});

	it('leaves words that name no one as they are', () => {
		for (const words of [
			'Single storey rear extension',
			'Reduce the oak overhanging the applicants boundary',
			'Erection of 3 Mrs-style dwellings'
		])
			expect(stripNames(words)).toEqual({ text: words, removed: 0 });
	});
});

describe('the planning records kept in the repository', () => {
	it('hold no description that names a person', () => {
		const dir = 'data/records';
		const named: string[] = [];
		for (const f of readdirSync(dir).filter((f) => /^planning[.-].*\.json$/.test(f)))
			for (const r of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).records)
				if (namesAPerson(r.claims.application ?? '')) named.push(`${f}: ${r.id}`);
		expect(named).toEqual([]);
	});

	it('hold no sale at an address', () => {
		const dir = 'data/records';
		for (const f of readdirSync(dir).filter((f) => /^price[.-].*\.json$/.test(f)))
			for (const r of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).records) {
				expect(r.address, f).toBeUndefined();
				expect(r.claims.sold, f).toBeUndefined();
			}
	});
});
