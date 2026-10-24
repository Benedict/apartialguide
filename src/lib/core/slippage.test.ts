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

	it('rambles when dense, keeping every feature', () => {
		const many = Array.from({ length: 9 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const plan = chooseSlippage('s1', [...street, ...many], [{ kind: 'dense' }]);
		expect(plan.mood).toBe('rambling');
		expect(plan.beats).toHaveLength(9);
	});

	it('otherwise notices only the nearest few', () => {
		const some = Array.from({ length: 6 }, (_, i) =>
			facts(`node/${i}`, { amenity: 'bench' })
		).flat();
		const plan = chooseSlippage('s1', [...street, ...some], []);
		expect(plan.mood).toBe('plain');
		expect(plan.beats.map((b) => b.subject)).toEqual(['node/0', 'node/1', 'node/2', 'node/3']);
	});
});
