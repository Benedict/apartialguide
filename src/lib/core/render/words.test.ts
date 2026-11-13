import { describe, expect, it } from 'vitest';
import { article, counted } from './words';

describe('counted, a phrase', () => {
	it('counts a phrase by its head: power lines carrying, pieces of', () => {
		expect(counted(2, 'power line carrying 275,000 volts')).toBe(
			'two power lines carrying 275,000 volts'
		);
		expect(counted(3, 'piece of play equipment')).toBe('three pieces of play equipment');
		expect(counted(2, 'electricity pylon')).toBe('two electricity pylons');
	});
});

describe('article', () => {
	it('gives a word that sounds “you” an “a”, in a walker’s words only', () => {
		expect(article('utility pole')).toBe('a utility pole');
		expect(article('utility pole', false)).toBe('an utility pole');
		expect(article('electricity pylon')).toBe('an electricity pylon');
	});
});
