import { describe, expect, it } from 'vitest';
import { destination } from '../geo';
import type { Scene } from '../scene';
import { facts } from '../testing/facts';
import { SyntheticMap } from '../testing/synthetic';
import { buildPrompt, PROMPT_VERSION, promptKey } from './prompt';

const O = SyntheticMap.ORIGIN;
const near = { geometry: [destination(O, 0, 15)] };

const scene = (s: Partial<Scene> = {}): Scene => ({
	stopId: 's1',
	street: facts('way/1', { highway: 'residential', name: 'Long Street', surface: 'asphalt' }),
	beats: [],
	hidden: [],
	mood: 'plain',
	position: O,
	kind: 'corridor',
	here: ['Long Street'],
	between: ['Short Row', 'Blind Alley'],
	exits: [{ label: 'east', to: 'a', street: 'Long Street', towards: 'Blind Alley' }],
	...s
});

const bank = {
	subject: 'way/2',
	facts: facts(
		'way/2',
		{ building: 'retail', old_name: 'est Bank', 'disused:amenity': 'bank' },
		near
	),
	effects: ['spoken-as-found' as const]
};
const shop = {
	subject: 'node/3',
	facts: facts('node/3', { shop: 'bakery', name: 'Crumb' }, { ...near, observed: '2018-10-04' }),
	effects: ['tense-slip' as const]
};

describe('buildPrompt', () => {
	it('keeps the style, rules and reference page in a fixed system prompt', () => {
		const a = buildPrompt(scene()).system;
		const b = buildPrompt(scene({ beats: [shop] })).system;
		expect(a).toBe(b);
		expect(a).toMatch(/Wainwright/);
		expect(a).toMatch(/Auster/);
		expect(a).toMatch(/never what the map says/);
		expect(a).toContain('“est Bank”');
	});

	it('states where the reader stands and what is underfoot', () => {
		const user = buildPrompt(scene()).user;
		expect(user).toContain('You are standing on Long Street, between Short Row and Blind Alley.');
		expect(user).toContain('Asphalt underfoot.');
	});

	it('gives each noticed thing its place, its record and what to do with it', () => {
		const user = buildPrompt(scene({ beats: [bank, shop] })).user;
		expect(user).toContain('To the north, a few steps away: a retail building');
		expect(user).toContain('old_name=est Bank');
		expect(user).toContain('Speak the name “est Bank” exactly as found');
		expect(user).toContain('last recorded in October 2018');
	});

	it('says nothing of hidden things', () => {
		const user = buildPrompt(scene({ beats: [bank], hidden: [shop] })).user;
		expect(user).not.toMatch(/unnoticed|hidden|\d+ more/i);
		expect(user).not.toContain('Crumb');
	});

	it('leaves noticing to the reader, and names nothing hidden in its reference page', () => {
		const { system } = buildPrompt(scene());
		expect(system).toMatch(/noticing is the reader’s/i);
		expect(system).not.toMatch(/hint/i);
		expect(system).not.toContain('Streets Ahead');
		expect(system).not.toContain('there may be more');
	});

	it('tells the model the game prints the exits', () => {
		expect(buildPrompt(scene()).user).toMatch(/do not list the exits/i);
	});

	it('keys a prompt by its content and version', () => {
		const k = promptKey(buildPrompt(scene()));
		expect(k).toBe(promptKey(buildPrompt(scene())));
		expect(k).not.toBe(promptKey(buildPrompt(scene({ beats: [shop] }))));
		expect(k.startsWith(`v${PROMPT_VERSION}-`)).toBe(true);
	});
});
