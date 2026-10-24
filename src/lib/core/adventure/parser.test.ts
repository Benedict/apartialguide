import { describe, expect, it } from 'vitest';
import { parse } from './parser';

describe('parse', () => {
	it.each([
		['n', 'north'],
		['NE', 'north-east'],
		['north east', 'north-east'],
		['northeast', 'north-east'],
		['go west', 'west'],
		['walk sw', 'south-west'],
		['nne', 'north-north-east'],
		['head towards the south', 'south']
	])('reads %j as going %s', (input, direction) => {
		expect(parse(input)).toEqual({ verb: 'go', direction });
	});

	it('reads a street name as a way to go', () => {
		expect(parse('go to Clyde Road')).toEqual({ verb: 'go', direction: 'clyde road' });
	});

	it.each([
		['l', { verb: 'look' }],
		['look', { verb: 'look' }],
		['exits', { verb: 'exits' }],
		['back', { verb: 'back' }],
		['go back', { verb: 'back' }],
		['help', { verb: 'help' }],
		['?', { verb: 'help' }],
		['', { verb: 'empty' }],
		['explore', { verb: 'explore' }],
		['search', { verb: 'explore' }],
		['look around', { verb: 'explore' }],
		['look closer', { verb: 'explore' }]
	])('reads %j', (input, command) => {
		expect(parse(input)).toEqual(command);
	});

	it.each(['x pub', 'examine pub', 'look at the pub', 'read pub'])(
		'reads %j as examining the pub',
		(input) => {
			expect(parse(input)).toEqual({ verb: 'examine', target: 'pub' });
		}
	);

	it('keeps what it cannot read', () => {
		expect(parse('Dance!')).toEqual({ verb: 'unknown', text: 'dance' });
	});
});
