import { describe, expect, it } from 'vitest';
import { openInPlace } from './landing';

// A stand-in for the page: a link, and what it is replaced with.
function link(frame?: string) {
	const handlers: ((e: { preventDefault(): void }) => void)[] = [];
	const made: Record<string, string>[] = [];
	let replaced: unknown;
	const el = {
		dataset: frame ? { frame } : {},
		addEventListener: (_: string, h: (e: { preventDefault(): void }) => void) => handlers.push(h),
		replaceWith: (node: unknown) => (replaced = node)
	};
	const make = () => {
		const attrs: Record<string, string> = {};
		made.push(attrs);
		return { setAttribute: (k: string, v: string) => (attrs[k] = v) };
	};
	return { el, handlers, made, replaced: () => replaced, make };
}

describe('openInPlace (the sign-up form, opened only when pressed)', () => {
	it('asks nothing until pressed, then puts the form where the link was', () => {
		const l = link('https://inventa.substack.com/embed');
		openInPlace([l.el as never], l.make as never);
		expect(l.made).toHaveLength(0);
		let prevented = false;
		l.handlers[0]({ preventDefault: () => (prevented = true) });
		expect(prevented).toBe(true);
		expect(l.made[0].src).toBe('https://inventa.substack.com/embed');
		expect(l.made[0].title).toBe('Sign up');
		expect(l.replaced()).toBeDefined();
	});
	it('leaves a plain link to be followed', () => {
		const l = link();
		openInPlace([l.el as never], l.make as never);
		expect(l.handlers).toHaveLength(0);
	});
});
