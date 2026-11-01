import { describe, expect, it } from 'vitest';
import { signupFrame } from './signup';

describe('signupFrame (a sign-up form that may open in the page)', () => {
	it('gives a Substack publication’s own form', () => {
		expect(signupFrame('https://inventa.substack.com')).toBe('https://inventa.substack.com/embed');
		expect(signupFrame('https://inventa.substack.com/')).toBe('https://inventa.substack.com/embed');
		expect(signupFrame('https://inventa.substack.com/about')).toBe(
			'https://inventa.substack.com/embed'
		);
	});
	it('gives none for any other list, which is only linked', () => {
		expect(signupFrame('https://buttondown.com/inventa')).toBeUndefined();
		expect(signupFrame('https://substack.com.example.org/')).toBeUndefined();
		expect(signupFrame(undefined)).toBeUndefined();
		expect(signupFrame('not a url')).toBeUndefined();
	});
});
