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

	it('reads asking where on a map this is', () => {
		for (const text of ['gps', 'GPS', 'where am i', 'where am I?', 'map'])
			expect(parse(text)).toEqual({ verb: 'gps' });
	});

	it('reads asking after the weather', () => {
		for (const text of ['weather', 'sky']) expect(parse(text)).toEqual({ verb: 'weather' });
	});

	it('reads looking up at what is overhead', () => {
		for (const text of ['look up', 'lookup', 'look at the sky', 'up'])
			expect(parse(text)).toEqual({ verb: 'overhead' });
	});

	it('reads using the camera', () => {
		for (const text of ['use the camera', 'use camera', 'camera', 'look through the camera'])
			expect(parse(text)).toEqual({ verb: 'camera' });
	});

	it('reads examine on its own as examining everything here', () => {
		expect(parse('examine')).toEqual({ verb: 'examine', target: '' });
		expect(parse('x')).toEqual({ verb: 'examine', target: '' });
	});

	it('keeps what it cannot read', () => {
		expect(parse('Dance!')).toEqual({ verb: 'unknown', text: 'dance' });
	});

	it('reads the classic verbs', () => {
		for (const t of ['z', 'wait']) expect(parse(t)).toEqual({ verb: 'wait' });
		for (const t of ['g', 'again']) expect(parse(t)).toEqual({ verb: 'again' });
		for (const t of ['i', 'inv', 'inventory']) expect(parse(t)).toEqual({ verb: 'inventory' });
		expect(parse('verbose')).toEqual({ verb: 'verbose' });
		expect(parse('brief')).toEqual({ verb: 'brief' });
		expect(parse('score')).toEqual({ verb: 'score' });
		for (const t of ['xyzzy', 'plugh']) expect(parse(t)).toEqual({ verb: 'magic' });
	});

	it('reads taking and dropping', () => {
		for (const t of ['take sextant', 'get the sextant', 'pick up the sextant'])
			expect(parse(t)).toEqual({ verb: 'take', target: 'sextant' });
		for (const t of ['drop sextant', 'leave the sextant', 'put down sextant'])
			expect(parse(t)).toEqual({ verb: 'drop', target: 'sextant' });
	});

	it('reads saving and restoring, with or without a slot', () => {
		expect(parse('save')).toEqual({ verb: 'save' });
		expect(parse('save 3')).toEqual({ verb: 'save', slot: '3' });
		for (const t of ['restore', 'load', 'saves']) expect(parse(t)).toEqual({ verb: 'restore' });
		for (const t of ['restore 3', 'load 3'])
			expect(parse(t)).toEqual({ verb: 'restore', slot: '3' });
		expect(parse('restore auto')).toEqual({ verb: 'restore', slot: 'auto' });
	});
});
