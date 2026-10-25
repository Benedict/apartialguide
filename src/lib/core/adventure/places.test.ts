import { describe, expect, it } from 'vitest';
import { findPlace, type Place } from './places';

const places: Place[] = [
	{ name: 'Long Street', kind: 'street', at: 'a' },
	{ name: 'Long Row', kind: 'street', at: 'b' },
	{ name: 'The Sextant', kind: 'place', at: 'c' },
	{ name: 'est Bank', kind: 'place', at: 'd' },
	{ name: 'ZZ1 1ZZ', kind: 'postcode', at: 'e' },
	{ name: 'ZZ1 2ZZ', kind: 'postcode', at: 'e' },
	{ name: 'ZZ1 3ZZ', kind: 'postcode', at: 'f' },
	{ name: 'ZZ1 9ZZ', kind: 'postcode', at: 'e' }
];

describe('findPlace', () => {
	it('finds a name whatever its case', () => {
		expect(findPlace(places, 'long street')).toEqual({ kind: 'found', at: 'a' });
	});

	it('finds a place without its article, and broken names as written', () => {
		expect(findPlace(places, 'sextant')).toEqual({ kind: 'found', at: 'c' });
		expect(findPlace(places, 'est bank')).toEqual({ kind: 'found', at: 'd' });
	});

	it('finds a postcode however it is spaced', () => {
		expect(findPlace(places, 'zz11zz')).toEqual({ kind: 'found', at: 'e' });
		expect(findPlace(places, ' ZZ1  3ZZ ')).toEqual({ kind: 'found', at: 'f' });
	});

	it('falls back on the postcodes that share its sector, and says which', () => {
		expect(findPlace(places, 'zz1 9aa')).toEqual({ kind: 'found', at: 'e', near: 'ZZ1 9' });
		expect(findPlace(places, 'zz1 1aa')).toEqual({ kind: 'found', at: 'e', near: 'ZZ1 1' });
	});

	it('takes the commonest stop for the first half of a postcode', () => {
		expect(findPlace(places, 'ZZ1')).toEqual({ kind: 'found', at: 'e' });
	});

	it('asks which, when a name could be several places', () => {
		expect(findPlace(places, 'long')).toEqual({
			kind: 'choose',
			names: ['Long Row', 'Long Street']
		});
	});

	it('finds nothing it has no record of', () => {
		expect(findPlace(places, 'Atlantis')).toEqual({ kind: 'none' });
		expect(findPlace(places, '')).toEqual({ kind: 'none' });
	});
});
