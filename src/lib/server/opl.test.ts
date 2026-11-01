import { describe, expect, it } from 'vitest';
import { oplElement } from './opl';

// Lines as osmium writes them (`osmium cat -f opl`), for invented places.
describe('oplElement', () => {
	it('reads a node: its id, version, time, tags and place', () => {
		expect(
			oplElement(
				'n101 v3 dV c0 t2021-01-14T10:00:00Z i0 u Tamenity=bench,name=Inventa%20%Seat x-0.0743 y51.3799'
			)
		).toEqual({
			type: 'node',
			id: 101,
			version: 3,
			timestamp: '2021-01-14T10:00:00Z',
			tags: { amenity: 'bench', name: 'Inventa Seat' },
			lon: -0.0743,
			lat: 51.3799
		});
	});

	it('reads a way and its nodes in order, and leaves tags out when there are none', () => {
		expect(oplElement('w7 v1 dV c0 t2019-05-01T00:00:00Z i0 u T Nn101,n102,n103')).toEqual({
			type: 'way',
			id: 7,
			version: 1,
			timestamp: '2019-05-01T00:00:00Z',
			nodes: [101, 102, 103]
		});
	});

	it('takes tag values as found, unescaping only what OPL escapes: commas, equals, spaces, percent', () => {
		const el = oplElement(
			'n5 v1 dV t2020-01-01T00:00:00Z Tname=est%20%Bank,note=a%2c%b%3d%c%25%d x0 y0'
		);
		expect(el?.tags).toEqual({ name: 'est Bank', note: 'a,b=c%d' });
	});

	it('unescapes any character OPL wrote by its code', () => {
		expect(
			oplElement('n6 v1 dV t2020-01-01T00:00:00Z Tname=Caf%e9%%20%%1f600% x0 y0')?.tags
		).toEqual({
			name: 'Café 😀'
		});
	});

	it('reads an area drawn as a multipolygon: its tags and its member ways, each with its role', () => {
		expect(
			oplElement(
				'r9 v2 dV c0 t2022-03-01T00:00:00Z i0 u Ttype=multipolygon,leisure=park,name=Inventa%20%Fields Mw7@outer,w8@outer,w11@inner'
			)
		).toEqual({
			type: 'relation',
			id: 9,
			version: 2,
			timestamp: '2022-03-01T00:00:00Z',
			tags: { type: 'multipolygon', leisure: 'park', name: 'Inventa Fields' },
			members: [
				{ type: 'way', ref: 7, role: 'outer' },
				{ type: 'way', ref: 8, role: 'outer' },
				{ type: 'way', ref: 11, role: 'inner' }
			]
		});
	});

	it('skips other relations, deleted things and blank lines', () => {
		expect(oplElement('r9 v1 dV t2020-01-01T00:00:00Z Ttype=route Mw7@')).toBeUndefined();
		expect(oplElement('n8 v2 dD t2020-01-01T00:00:00Z T x y')).toBeUndefined();
		expect(oplElement('')).toBeUndefined();
	});
});
