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
		expect(a).toMatch(/never about what the map says/);
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
		expect(system).toContain(
			'Beyond it there may be more. I could not say what, or how much. I lose count before I have begun.'
		);
	});

	it('tells the model what has gone, in the past tense only', () => {
		const gone = {
			subject: 'node/7',
			facts: facts(
				'node/7',
				{ 'was:shop': 'bakery', 'was:name': 'Crumb' },
				{ ...near, source: 'osm-history', observed: '2017-01-01' }
			),
			effects: ['remembered' as const]
		};
		const user = buildPrompt(scene({ beats: [gone] })).user;
		expect(user).toContain('a bakery, “Crumb”');
		expect(user).toContain('Gone: recorded in January 2017, no longer on the map.');
	});

	it('asks the model to correct itself between names', () => {
		const pub = {
			subject: 'node/8',
			facts: [
				...facts('node/8', { amenity: 'pub', name: 'The Sextant' }, near),
				...facts(
					'node/8',
					{ 'was:name': 'The Anchor' },
					{ source: 'osm-history', observed: '2017-01-01' }
				)
			],
			effects: ['self-correction' as const]
		};
		expect(buildPrompt(scene({ beats: [pub] })).user).toContain(
			'Was called “The Anchor” in January 2017. Correct yourself between the names.'
		);
	});

	it('keeps another account apart from the map', () => {
		const pub = {
			subject: 'node/4',
			facts: [
				...facts('node/4', { amenity: 'pub', name: 'The Sextant' }, near),
				...facts('node/4', { 'wikidata:description': 'invented public house' }, near).map((f) => ({
					...f,
					source: 'wikidata'
				}))
			],
			effects: []
		};
		const user = buildPrompt(scene({ beats: [pub] })).user;
		expect(user).toContain('The map: amenity=pub; name=The Sextant.');
		expect(user).toContain('Elsewhere (Wikidata): wikidata:description=invented public house.');
		expect(buildPrompt(scene()).system).toMatch(/elsewhere/i);
	});

	it('gives the weather of a day something was last recorded', () => {
		const weather = facts('weather/2018-10-04', { 'weather:code': '61' }).map((f) => ({
			...f,
			geometry: [],
			observed: '2018-10-04'
		}));
		const user = buildPrompt(scene({ beats: [shop], weather })).user;
		expect(user).toContain('The weather that day: Light rain that day.');
	});

	it('names the street’s namesake where the reader stands', () => {
		const street = facts('way/1', {
			highway: 'residential',
			name: 'Long Street',
			'etymology:label': 'Ada Inventa'
		});
		expect(buildPrompt(scene({ street })).user).toContain('Named for Ada Inventa.');
	});

	it('keeps Auster in what is noticed and Wainwright in the voice, lost about facts, never meaning', () => {
		const { system } = buildPrompt(scene());
		expect(system).not.toMatch(/who you are|unsure of who it is/);
		expect(system).toMatch(/never about what anything means/);
		expect(system).toMatch(/never point out that a name is broken/i);
		expect(system).not.toMatch(/no weather/);
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
