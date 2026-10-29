import { describe, expect, it } from 'vitest';
import { unfounded } from './founded';

const facts = [
	'Where the reader stands:',
	'You are standing where Invented Road and Mill Lane meet. The limit is 30 mph.',
	'1. To the north: a fast food place at 207 Invented Road, “Inventa Kebab”.',
	'   Last recorded in October 2018. Its food hygiene rating is 5, given in April 2025.'
].join('\n');

describe('unfounded', () => {
	it('finds nothing amiss in prose made only of the facts it was given', () => {
		expect(
			unfounded(facts, [
				'Invented Road meets Mill Lane here, at 30 mph. At 207 there is a kebab place, “Inventa Kebab”.',
				'There was one in October 2018. They say it was rated 5, in April 2025.'
			])
		).toEqual([]);
	});

	it('finds numbers the facts do not give', () => {
		expect(unfounded(facts, ['At 209 there is a kebab place, open since 1987.'])).toEqual([
			'209',
			'1987'
		]);
	});

	it('finds names and quotations the facts do not give', () => {
		expect(
			unfounded(facts, [
				'The kebab place was once “Old Inventa Grill”, and before that a Victorian bakery.'
			])
		).toEqual(['“Old Inventa Grill”', 'Victorian']);
	});

	it('lets a sentence begin with a capital, and lets Guide say I', () => {
		expect(
			unfounded(facts, ['Nearest is the kebab place. I could not say more. Beyond it, a lane.'])
		).toEqual([]);
	});

	it('begins a sentence after a quotation that ends one', () => {
		const asked = 'An application: “Alterations to an invented shopfront.” It was “Approved”.';
		expect(
			unfounded(asked, ['Asked: “Alterations to an invented shopfront.” Against it, “Approved”.'])
		).toEqual([]);
	});

	it('lets a quotation give part of what the facts say, never more', () => {
		expect(unfounded(facts, ['It is called “Inventa”, in part.'])).toEqual([]);
		expect(unfounded(facts, ['It is called “Inventa Grill”.'])).toEqual(['“Inventa Grill”']);
	});

	it('reads thousands written with commas in the facts as in the prose', () => {
		expect(
			unfounded('Sold for £400,000 in July 2019.', ['They say it sold for £400,000.'])
		).toEqual([]);
	});

	it('reads thousands and ranges as the facts give them', () => {
		const sold = 'A house at 12-14 Invented Road sold for 412000 in March 2019.';
		expect(unfounded(sold, ['At 12–14 a house sold for 412,000, in March 2019.'])).toEqual([]);
	});
});
