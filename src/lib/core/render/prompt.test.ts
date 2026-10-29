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
		expect(user).toContain('Once “est Bank”.');
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
		expect(user).toContain('The map: A pub, “The Sextant”.');
		expect(user).toContain(
			'Elsewhere, kept by those who keep an encyclopaedia of everything: Elsewhere it is listed as “invented public house”.'
		);
		expect(user).not.toContain('Wikidata');
		expect(buildPrompt(scene()).system).toMatch(/elsewhere/i);
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
		expect(system).toMatch(/at most one sentence/i);
		expect(system).toMatch(/never point out that a name is broken/i);
		expect(system).not.toMatch(/no weather/);
	});

	it('tells the model what stood at a thing’s address and went, as part of it', () => {
		const building = {
			subject: 'way/3',
			facts: [
				...facts('way/3', { building: 'retail', 'addr:housenumber': '9' }, near),
				...facts('node/9', { 'was:amenity': 'bank', 'was:name': 'Invented Bank' }, near).map(
					(f) => ({
						...f,
						source: 'osm-history',
						observed: '2021-01-01'
					})
				)
			],
			effects: ['was-here' as const]
		};
		const user = buildPrompt(scene({ beats: [building] })).user;
		expect(user).toContain('The map: A retail building at 9.');
		expect(user).toContain(
			'Once at this address, gone from the map since January 2021: a bank, “Invented Bank”. One place: tell it once.'
		);
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

	it('gives the model the map in words, never its raw record', () => {
		const platform = {
			subject: 'node/11',
			facts: facts(
				'node/11',
				{
					public_transport: 'platform',
					railway: 'platform',
					bench: 'yes',
					bin: 'yes',
					shelter: 'yes',
					lit: 'yes',
					wheelchair: 'yes',
					tactile_paving: 'yes',
					'naptan:AtcoCode': '9400ZZINVENT1',
					ref: 'INV-1'
				},
				near
			),
			effects: []
		};
		const line = {
			subject: 'way/12',
			facts: facts(
				'way/12',
				{ railway: 'tram', name: 'Invented Line', voltage: '750', gauge: '1435', frequency: '0' },
				near
			),
			effects: []
		};
		const user = buildPrompt(scene({ beats: [platform, line] })).user;
		expect(user).not.toMatch(/[a-z_:]+=/);
		expect(user).toContain('A bench, a bin and a shelter.');
		expect(user).toContain('Lit at night.');
		expect(user).toContain('Wheelchairs can use it.');
		expect(user).toContain('Tactile paving.');
		expect(user).toContain('It carries a reference, “INV-1”.');
		for (const raw of ['9400ZZ', 'voltage', '750', 'gauge', '1435', 'frequency'])
			expect(user).not.toContain(raw);
	});

	it('gives the model other accounts in words too', () => {
		const cafe = {
			subject: 'node/13',
			facts: [
				...facts('node/13', { amenity: 'cafe', name: 'Invented Cafe' }, near),
				...facts('node/13', { 'hygiene:rating': '5', 'hygiene:date': '2025-04-01' }, near).map(
					(f) => ({ ...f, source: 'Food Standards Agency', elsewhere: true as const })
				)
			],
			effects: []
		};
		const user = buildPrompt(scene({ beats: [cafe] })).user;
		expect(user).toContain(
			'Elsewhere, kept by those who inspect kitchens: Its food hygiene rating is 5, given in April 2025.'
		);
	});

	it('does not ask every crowded place to end the same way', () => {
		const said = new Set(
			['s1', 's2', 's3', 's4', 's5', 's6'].map((stopId) =>
				buildPrompt(scene({ stopId, mood: 'rambling', beats: [shop] }))
					.user.split('\n')
					.at(-2)
			)
		);
		expect(said.size).toBeGreaterThan(1);
		const { system } = buildPrompt(scene());
		expect(system).toMatch(/never end on (counting|losing count)/i);
	});

	it('is version 15', () => {
		expect(PROMPT_VERSION).toBe(15);
	});

	it('tells the model never to name a source', () => {
		expect(buildPrompt(scene()).system).toMatch(/never name a source/i);
	});

	it('gives each of the five writers a part, and lets one sentence a place reach for meaning', () => {
		const { system } = buildPrompt(scene());
		for (const writer of ['Wainwright', 'Defoe', 'Sinclair', 'Auster', 'Blake'])
			expect(system).toContain(writer);
		expect(system).toMatch(/at most one sentence/i);
		expect(system).toMatch(/no purpose, use or history that the facts do not give/i);
		expect(system).toMatch(/do not muse on yourself/i);
	});

	it('never calls a thing the map gives no kind “something”, as though the map said so', () => {
		const point = (subject: string, tags: Record<string, string>) => ({
			subject,
			facts: facts(subject, tags, near),
			effects: []
		});
		const user = buildPrompt(
			scene({
				beats: [
					point('node/21', { noexit: 'yes' }),
					point('node/22', { entrance: 'yes' }),
					point('node/23', { fixme: 'what is this' })
				]
			})
		).user;
		expect(user).toContain('The way ends here.');
		expect(user).toContain('An entrance.');
		expect(user).toContain('A point the map marks without saying what it is.');
		expect(user).not.toMatch(/The map: Something/);
	});

	it('gives a bench only another account has by its kind, never as undefined', () => {
		const bench = {
			subject: 'bench/7',
			facts: facts('bench/7', { 'bench:kind': 'bench', 'bench:inscription': 'For Ada' }, near).map(
				(f) => ({ ...f, source: 'OpenBenches', elsewhere: true as const })
			),
			effects: []
		};
		const user = buildPrompt(scene({ beats: [bench] })).user;
		expect(user).toContain('a bench, which the map does not have');
		expect(user).toContain('Elsewhere, kept by those who read the benches: On it: “For Ada”.');
		expect(user).not.toContain('undefined');
	});

	it('asks for the limit plainly, never with a remark on it', () => {
		expect(buildPrompt(scene()).system).toMatch(/speed limit plainly/i);
	});
});
