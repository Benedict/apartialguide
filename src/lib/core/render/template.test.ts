import { describe, expect, it } from 'vitest';
import type { NarrationPlan } from '../slippage';
import { facts } from '../testing/facts';
import { TemplateRenderer } from './template';

const renderer = new TemplateRenderer();
const street = facts('way/1', {
	highway: 'residential',
	name: 'Everton Road',
	surface: 'asphalt',
	lit: 'yes',
	maxspeed: '20 mph'
});

const plan = (p: Partial<NarrationPlan>): NarrationPlan => ({
	stopId: 's1',
	street,
	beats: [],
	mood: 'plain',
	...p
});

describe('TemplateRenderer', () => {
	it('names the street and what is underfoot', () => {
		const text = renderer.render(plan({}));
		expect(text).toContain('Everton Road');
		expect(text).toMatch(/asphalt/i);
		expect(text).toMatch(/lit/i);
		expect(text).toContain('20 mph');
	});

	it('speaks a broken name exactly as found', () => {
		const bank = facts('way/2', { old_name: 'est Bank', 'disused:amenity': 'bank' });
		const text = renderer.render(
			plan({ beats: [{ subject: 'way/2', facts: bank, effects: ['spoken-as-found'] }] })
		);
		expect(text).toContain('“est Bank”');
		expect(text).not.toMatch(/\p{L}est Bank/u);
	});

	it('tells a disused use in the past tense', () => {
		const bank = facts('way/2', { 'disused:amenity': 'bank' });
		const text = renderer.render(plan({ beats: [{ subject: 'way/2', facts: bank, effects: [] }] }));
		expect(text).toMatch(/was a bank/);
	});

	it('slips between present and past for a dated feature', () => {
		const shop = facts(
			'node/3',
			{ shop: 'bakery', 'addr:housenumber': '225' },
			{ observed: '2018-10-04' }
		);
		const text = renderer.render(
			plan({ beats: [{ subject: 'node/3', facts: shop, effects: ['tense-slip'] }] })
		);
		expect(text).toMatch(/there[’']s a bakery/i);
		expect(text).toMatch(/there was a bakery/i);
		expect(text).toContain('2018');
	});

	it('gives uncountable things no article', () => {
		const parking = facts('node/4', { amenity: 'bicycle_parking' });
		const text = renderer.render(
			plan({ beats: [{ subject: 'node/4', facts: parking, effects: [] }] })
		);
		expect(text).toContain('Bicycle parking.');
	});

	it('describes a bus stop by its name', () => {
		const stop = facts('node/5', { highway: 'bus_stop', name: 'Weir Steps' });
		const text = renderer.render(
			plan({ beats: [{ subject: 'node/5', facts: stop, effects: [] }] })
		);
		expect(text).toContain('A bus stop — “Weir Steps”.');
	});

	it('hesitates when there is little to go on', () => {
		const text = renderer.render(plan({ mood: 'hesitant' }));
		expect(text).toMatch(/…|—/);
	});

	it('loses the thread when crowded', () => {
		const many = Array.from({ length: 9 }, (_, i) => ({
			subject: `node/${i}`,
			facts: facts(`node/${i}`, { amenity: 'bench' }),
			effects: []
		}));
		expect(renderer.render(plan({ mood: 'rambling', beats: many }))).toMatch(/where was I/i);
	});

	it('says the same thing at the same stop every time', () => {
		expect(renderer.render(plan({ mood: 'hesitant' }))).toBe(
			renderer.render(plan({ mood: 'hesitant' }))
		);
	});
});
