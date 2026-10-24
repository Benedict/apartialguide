import { describe, expect, it } from 'vitest';
import { chooseSlippage } from './slippage';
import { facts } from './testing/facts';

const street = facts('way/1', { highway: 'residential', name: 'A Street' });
const bank = facts('way/2', { old_name: 'est Bank', 'disused:amenity': 'bank' });

describe('chooseSlippage', () => {
	it('keeps street facts apart from the features beside it', () => {
		const plan = chooseSlippage('s1', [...street, ...bank], []);
		expect(plan.street.map((f) => f.claim.key)).toEqual(['highway', 'name']);
		expect(plan.beats.map((b) => b.subject)).toEqual(['way/2']);
	});

	it('speaks a fragment as found', () => {
		const plan = chooseSlippage(
			's1',
			[...street, ...bank],
			[{ kind: 'fragment', subject: 'way/2', fact: bank[0] }]
		);
		expect(plan.beats[0].effects).toContain('spoken-as-found');
	});

	it('slips the tense of a dated feature', () => {
		const plan = chooseSlippage(
			's1',
			[...street, ...bank],
			[{ kind: 'dated', subject: 'way/2', observed: '2018-10-04' }]
		);
		expect(plan.beats[0].effects).toContain('tense-slip');
	});

	it('hesitates when sparse', () => {
		expect(chooseSlippage('s1', street, [{ kind: 'sparse' }]).mood).toBe('hesitant');
	});

	it('rambles when dense, noticing only the nearest two and hiding the rest', () => {
		const many = Array.from({ length: 9 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const plan = chooseSlippage('s1', [...street, ...many], [{ kind: 'dense' }]);
		expect(plan.mood).toBe('rambling');
		expect(plan.beats.map((b) => b.subject)).toEqual(['node/0', 'node/1']);
		expect(plan.hidden).toHaveLength(7);
	});

	it('otherwise notices the nearest few and hides the rest', () => {
		const some = Array.from({ length: 6 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const plan = chooseSlippage('s1', [...street, ...some], []);
		expect(plan.mood).toBe('plain');
		expect(plan.beats.map((b) => b.subject)).toEqual(['node/0', 'node/1', 'node/2', 'node/3']);
		expect(plan.hidden.map((b) => b.subject)).toEqual(['node/4', 'node/5']);
	});

	it('always notices a broken name, however far down', () => {
		const some = Array.from({ length: 6 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const plan = chooseSlippage(
			's1',
			[...street, ...some, ...bank],
			[{ kind: 'fragment', subject: 'way/2', fact: bank[0] }]
		);
		expect(plan.beats.map((b) => b.subject)).toContain('way/2');
		expect(plan.hidden.map((b) => b.subject)).not.toContain('way/2');
	});

	it('leaves an old survey hidden when it is beyond attention', () => {
		const some = Array.from({ length: 6 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const shop = facts('node/9', { shop: 'bakery' });
		const plan = chooseSlippage(
			's1',
			[...street, ...some, ...shop],
			[{ kind: 'dated', subject: 'node/9', observed: '2018-10-04' }]
		);
		expect(plan.hidden.map((b) => b.subject)).toContain('node/9');
	});

	it('tells the land you stand in without letting it use up attention', () => {
		const areas = [
			...facts('way/20', { landuse: 'retail' }),
			...facts('way/21', { landuse: 'residential' }),
			...facts('node/22', { place: 'suburb', name: 'Addiscombe' })
		];
		const some = Array.from({ length: 5 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const plan = chooseSlippage('s1', [...street, ...areas, ...some], []);
		expect(plan.beats.map((b) => b.subject)).toEqual([
			'way/20',
			'way/21',
			'node/22',
			'node/0',
			'node/1',
			'node/2',
			'node/3'
		]);
	});
});
