import { describe, expect, it } from 'vitest';
import { allusion, alludedTo, keeper } from './keepers';

describe('keeper', () => {
	it('is the keeper’s name as found, without the file or layer a fetch noted after it', () => {
		expect(keeper('wikidata')).toBe('Wikidata');
		expect(keeper('Greater London Authority, Public_Realm_tree_list.csv')).toBe(
			'Greater London Authority'
		);
		expect(keeper('Office for National Statistics (Wards_December_2024)')).toBe(
			'Office for National Statistics'
		);
	});
});

describe('allusion', () => {
	it('names what a keeper does, never the keeper', () => {
		expect(allusion('Food Standards Agency')).toBe('those who inspect kitchens');
		expect(allusion('British Geological Survey, index of mine plans')).toBe(
			'those who keep the plans of old mines and the rocks beneath'
		);
		expect(allusion('Robert Hunt, Mineral Statistics')).toBe(
			'those who counted what the mines raised'
		);
		expect(allusion('OpenBenches')).toBe('those who read the benches');
		expect(allusion('Invented Registry')).toBeUndefined();
	});
});

describe('alludedTo', () => {
	it('lists the keepers by what they do, and owns to others it cannot place', () => {
		expect(alludedTo(['Food Standards Agency', 'Office for National Statistics'])).toBe(
			'those who inspect kitchens and those who draw the wards and number the streets'
		);
		expect(alludedTo(['Food Standards Agency', 'Invented Registry'])).toBe(
			'those who inspect kitchens, and others'
		);
		expect(alludedTo(['Invented Registry'])).toBe('others');
	});
});
