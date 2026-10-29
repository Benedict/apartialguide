import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import type { Scene } from '../scene';
import { facts } from '../testing/facts';
import { SyntheticMap } from '../testing/synthetic';
import { AdventureRenderer } from './adventure';
import { CachedRenderer, namesNoSource, type NarrationStore } from './cached';
import { buildPrompt, promptKey } from './prompt';

const O = SyntheticMap.ORIGIN;
const bank = {
	subject: 'way/2',
	facts: facts(
		'way/2',
		{ building: 'retail', old_name: 'est Bank' },
		{ geometry: [destination(O, 0, 15)] }
	),
	effects: ['spoken-as-found' as const]
};
const hiddenBench = {
	subject: 'node/5',
	facts: facts('node/5', { amenity: 'bench' }, { geometry: [destination(O, 90, 10)] }),
	effects: []
};

const scene: Scene = {
	stopId: 's1',
	street: facts('way/1', { highway: 'residential', name: 'Long Street' }),
	beats: [bank],
	hidden: [hiddenBench],
	mood: 'plain',
	position: O,
	kind: 'corridor',
	here: ['Long Street'],
	between: ['Short Row', 'Blind Alley'],
	exits: [{ label: 'east', to: 'a', street: 'Long Street', towards: 'Blind Alley' }]
};

const key = promptKey(buildPrompt(scene));
const store = (prose: string[]): NarrationStore => ({
	[key]: { paragraphs: prose, model: 'recorded', written: '2026-10-24' }
});
const template = new AdventureRenderer().render(scene);

describe('CachedRenderer', () => {
	it('uses the stored prose and keeps the exits line', () => {
		const room = new CachedRenderer(store(['Long Street. The name says “est Bank”.'])).render(
			scene
		);
		expect(room.paragraphs).toEqual([
			'Long Street. The name says “est Bank”.',
			'Exits: east (Long Street, towards Blind Alley).'
		]);
	});

	it('gives the prose as the parts the engine tells on arrival, with the exits after', () => {
		const room = new CachedRenderer(store(['Long Street.', 'The name says “est Bank”.'])).render(
			scene
		);
		expect(room.parts?.map((p) => p.map((x) => x.text).join(' '))).toEqual([
			'Long Street.',
			'The name says “est Bank”.',
			'Exits: east (Long Street, towards Blind Alley).'
		]);
		expect(room.parts?.flat().some((p) => p.kind === 'where')).toBe(false);
	});

	it('keeps the title, the things to examine and the closer look from the template', () => {
		const room = new CachedRenderer(store(['“est Bank”.'])).render(scene);
		expect(room.title).toBe(template.title);
		expect(room.things).toEqual(template.things);
		expect(room.hidden).toEqual(template.hidden);
	});

	it('falls back to the template when nothing is stored for the stop', () => {
		expect(new CachedRenderer({}).render(scene)).toEqual(template);
	});

	it('falls back to the template when the prose repairs a broken name', () => {
		const room = new CachedRenderer(store(['The West Bank stands here.'])).render(scene);
		expect(room).toEqual(template);
	});
});

describe('namesNoSource', () => {
	const pub = (source: string, operator?: string) =>
		({
			beats: [
				{
					subject: 'node/4',
					facts: [
						...facts('node/4', {
							amenity: 'pub',
							name: 'The Sextant',
							...(operator ? { operator } : {})
						}),
						...facts('node/4', { 'hygiene:rating': '5' }).map((f) => ({
							...f,
							source,
							elsewhere: true as const
						}))
					],
					effects: []
				}
			]
		}) as unknown as Scene;

	it('refuses prose that names the keeper of another account, or Wikidata', () => {
		expect(namesNoSource(pub('Invented Registry'), ['By the Invented Registry, a 5.'])).toBe(false);
		expect(namesNoSource(pub('Invented Registry'), ['Wikidata lists it.'])).toBe(false);
		expect(namesNoSource(pub('Invented Registry'), ['They say a 5.'])).toBe(true);
	});

	it('refuses prose that calls what others keep another account', () => {
		expect(namesNoSource(pub('Invented Registry'), ['By another account, a 5.'])).toBe(false);
	});

	it('lets a name stand that is also one of the map’s own facts', () => {
		expect(
			namesNoSource(pub('Invented Registry', 'Invented Registry'), ['Run by Invented Registry.'])
		).toBe(true);
	});
});
