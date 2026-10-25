import { groupBySubject, type Fact } from '../facts';
import { bearing, compassLabel, insideRing, nearestOnPolyline, type LatLon } from '../geo';
import type { Tags } from '../osm';
import type { Scene, SceneExit } from '../scene';
import { isBackground, type Beat } from '../slippage';
import { isElsewhere, isHistory } from '../tensions';
import type { Renderer, Room, Thing } from './renderer';
import { weatherThatDay } from './weather';
import {
	address,
	article,
	capitalise,
	counted,
	currentUse,
	humanise,
	list,
	longDate,
	monthYear,
	pastUse,
	pick,
	tagsOf
} from './words';

/**
 * Writes a stop as a room in a text adventure, in Guide's voice. Every noun comes from a fact;
 * the phrases around them are Guide's.
 */
export class AdventureRenderer implements Renderer {
	render(scene: Scene): Room {
		const street = streetTags(scene);
		const paragraphs = [
			[whereYouStand(scene, street), ...streetCharacter(street), setting(scene)]
				.filter(Boolean)
				.join(' '),
			...whatYouSee(scene),
			exitsLine(scene.exits)
		];
		if (scene.mood === 'hesitant') paragraphs.splice(-1, 0, pick(scene.stopId, HESITATIONS));
		return {
			title: title(scene, street),
			paragraphs: paragraphs.filter(Boolean),
			things: scene.beats.filter((b) => !isHalf(b)).map(thing),
			hidden: closerLook(scene)
		};
	}
}

const HESITATIONS = [
	'Beyond that… nothing I can put a name to.',
	'There’s — no. Nothing else. Nothing else here.',
	'I had thought there was more along here — apparently not. Apparently not.'
];

const LOST_COUNT = [
	'And more besides, or perhaps not — I lose count. Where was I.',
	'And more, possibly — I lose count.'
];

/** Tags of the main street underfoot. */
export const streetTags = (scene: Scene): Tags =>
	tagsOf([...groupBySubject(scene.street).values()][0] ?? []);

const streetName = (scene: Scene, street: Tags) =>
	scene.here[0] ?? `an unnamed ${humanise(street.highway)}`;

const isDeadEnd = (scene: Scene) => scene.kind === 'junction' && scene.exits.length === 1;

function title(scene: Scene, street: Tags): string {
	if (scene.here.length >= 2) return list(scene.here);
	const name = capitalise(streetName(scene, street));
	return isDeadEnd(scene) ? `End of ${name}` : name;
}

export function whereYouStand(scene: Scene, street: Tags): string {
	const name = streetName(scene, street);
	if (isDeadEnd(scene)) return `You are at the end of ${name}.`;
	if (scene.here.length >= 2) return `You are standing where ${list(scene.here)} meet.`;
	const [a, b] = scene.between ?? [];
	if (a && b && a !== b) return `You are standing on ${name}, between ${a} and ${b}.`;
	if (a || b) return `You are standing on ${name}, towards ${a ?? b}.`;
	return `You are standing on ${name}.`;
}

const SIDEWALKS: Record<string, string> = {
	both: 'pavement on both sides',
	left: 'pavement on one side',
	right: 'pavement on one side',
	separate: 'the pavement running apart from the road',
	no: 'no pavement at all'
};

export function streetCharacter(street: Tags): string[] {
	const sentences: string[] = [];
	if (street.surface) sentences.push(`${capitalise(humanise(street.surface))} underfoot.`);
	const lit = street.lit === 'yes' ? 'Lit at night' : street.lit === 'no' ? 'Unlit' : undefined;
	const pavement =
		street.sidewalk && (SIDEWALKS[street.sidewalk] ?? `pavement: ${street.sidewalk}`);
	if (lit && pavement) sentences.push(`${lit}, with ${pavement}.`);
	else if (lit || pavement) sentences.push(`${capitalise((lit ?? pavement)!)}.`);
	if (street.maxspeed) sentences.push(`The limit is ${street.maxspeed}, for what that is worth.`);
	const namesake = street['etymology:label'];
	const who = street['etymology:description'];
	if (namesake) sentences.push(`Named for ${namesake}${who ? `, ${who}` : ''}.`);
	return sentences;
}

function whatYouSee(scene: Scene): string[] {
	let previous = '';
	const told = scene.beats
		.filter((b) => !isBackground(b) && !isHalf(b))
		.map((b) => {
			const place = placement(scene.position, b);
			const said = describeBeat(
				b,
				place === previous && place.startsWith('To the') ? 'Next to it' : place,
				scene.weather
			);
			previous = place;
			return said;
		});
	const more = scene.hidden.length > 0;
	if (scene.mood === 'rambling') {
		// A crowd: what is noticed in full, then Guide loses count of the rest.
		const lost = more ? [pick(scene.stopId, LOST_COUNT)] : [];
		return [[pick(scene.stopId, CROWD_OPENERS), ...told, ...lost].join(' ')];
	}
	// Guide points to nothing: what goes unnoticed is for the reader to find.
	return told;
}

/** What a closer look finds: the hidden things in one breath, named things by name and repeats counted. */
function closerLook(scene: Scene): Room['hidden'] {
	const hidden = scene.hidden.filter((b) => !isHalf(b));
	if (!hidden.length) return undefined;
	const found = tally(hidden.map(brief));
	return {
		lines: [`Looking closer, you find ${found.join(', and ')}.`],
		things: hidden.map(thing)
	};
}

const CROWD_OPENERS = ['There is a great deal here.', 'Too much to take in at once.'];

/** A crowd member in a breath: named things by name, the unnamed by what they are. */
function brief(beat: Beat): { phrase: string; noun?: string } {
	const tags = tagsFor(beat);
	if (isElsewhereOnly(beat)) return { phrase: `“${tags['wikidata:label']}”, by another account` };
	const what = noun(tags);
	if (tags.name) {
		const saysItAll = tags.name.toLowerCase().includes(what.split(' ').at(-1)!);
		return { phrase: saysItAll ? tags.name : `${tags.name}, ${article(what)}` };
	}
	if (tags.old_name) return { phrase: `${article(what)} that was once “${tags.old_name}”` };
	return { phrase: article(what), noun: what };
}

/** Collapses repeats of the same unnamed thing into a count, keeping first-seen order. */
function tally(items: { phrase: string; noun?: string }[]): string[] {
	const counts = new Map<string, number>();
	for (const i of items) counts.set(i.noun ?? i.phrase, (counts.get(i.noun ?? i.phrase) ?? 0) + 1);
	return [...counts].map(([key, n]) => {
		const item = items.find((i) => (i.noun ?? i.phrase) === key)!;
		return item.noun ? counted(n, item.noun) : item.phrase;
	});
}

/** Whether `at` lies within a closed outline. */
function isInside(at: LatLon, geometry: readonly LatLon[]): boolean {
	const closed = geometry.length > 3 && geometry[0].join() === geometry.at(-1)!.join();
	return closed && insideRing(at, geometry);
}

/**
 * The land underfoot in one sentence: the place by name, the areas you are in, and those beside you.
 * "Here you are in Addiscombe, in a residential area, and beside a retail area to the north-west."
 */
export function setting(scene: Scene): string {
	const phrases: string[] = [];
	const said = new Set<string>();
	const say = (key: string, phrase: string) => {
		if (said.has(key)) return;
		said.add(key);
		phrases.push(phrase);
	};
	const land = scene.beats
		.filter(isBackground)
		.map((b) => ({ tags: tagsOf(b.facts), geometry: b.facts[0].geometry }));
	for (const { tags } of land)
		if (tags.place && tags.name) say(`place ${tags.name}`, `in ${tags.name}`);
	const areas = land.filter(({ tags }) => !tags.place);
	const phrase = (tags: Tags) => `${article(noun(tags))}${tags.name ? `, “${tags.name}”,` : ''}`;
	const key = (tags: Tags) => `${noun(tags)} ${tags.name ?? ''}`;
	for (const { tags, geometry } of areas)
		if (isInside(scene.position, geometry)) say(key(tags), `in ${phrase(tags).replace(/,$/, '')}`);
	for (const { tags, geometry } of areas) {
		if (isInside(scene.position, geometry)) continue;
		const { point } = nearestOnPolyline(scene.position, geometry);
		say(key(tags), `beside ${phrase(tags)} to the ${compassLabel(bearing(scene.position, point))}`);
	}
	if (!phrases.length) return '';
	const joined =
		phrases.length < 2 ? phrases[0] : `${phrases.slice(0, -1).join(', ')}, and ${phrases.at(-1)}`;
	return `Here you are ${joined}.`;
}

/** "To the north, a few steps away" */
export function placement(from: LatLon, beat: Beat): string {
	const geometry = beat.facts[0].geometry;
	if (isInside(from, geometry)) return 'All around';
	const { point, metres } = nearestOnPolyline(from, geometry);
	if (metres < 3) return 'Right here';
	const near =
		metres < 10
			? 'beside you'
			: metres < 25
				? 'a few steps away'
				: `about ${Math.round(metres / 5) * 5} metres off`;
	return `To the ${compassLabel(bearing(from, point))}, ${near}`;
}

/** Building values that are already nouns. Anything else ("retail") gets "building" after it. */
const BUILDING_NOUNS = new Set([
	'house',
	'bungalow',
	'church',
	'chapel',
	'garage',
	'garages',
	'shed',
	'school',
	'warehouse',
	'hotel',
	'hospital',
	'hut',
	'barn',
	'kiosk',
	'terrace'
]);

/** What a thing is now, or failing that what it is built as. */
function noun(tags: Tags): string {
	const use = currentUse(tags) ?? kind(tags);
	if (use) return use;
	const built = tags.building;
	if (built)
		return BUILDING_NOUNS.has(built)
			? humanise(built)
			: built === 'yes'
				? 'building'
				: `${humanise(built)} building`;
	return address(tags) ? 'address' : 'something';
}

/** Mapped things that are neither a use nor a building: land, trees, rails, fences. */
const KIND_KEYS = [
	'place',
	'landuse',
	'natural',
	'traffic_calming',
	'railway',
	'barrier',
	'public_transport',
	'man_made',
	'power',
	'emergency'
];

function kind(tags: Tags): string | undefined {
	const key = KIND_KEYS.find((k) => tags[k]);
	if (!key) return undefined;
	const value = tags[key] === 'yes' ? key : humanise(tags[key]);
	if (key === 'landuse') return `${value} area`;
	if (key === 'traffic_calming') return tags[key] === 'yes' ? 'speed bump' : `speed ${value}`;
	return value;
}

/** Whether the thing's name belongs in the noun phrase, rather than read off it as a sign. */
const namedInline = (tags: Tags) => !!tags.name && !!(currentUse(tags) ?? kind(tags));

export function nounPhrase(tags: Tags): string {
	const where = address(tags);
	const at = where ? ` at ${where}` : '';
	const name = namedInline(tags) ? `, “${tags.name}”` : '';
	return `${article(noun(tags))}${at}${name}`;
}

/** "To the north, a few steps away," takes a comma before what follows; "Right here" does not. */
const lead = (place: string) => (place.startsWith('To the') ? `${place},` : place);

/** A thing's tags as it is now, or, if it has gone, as it was last recorded. */
export function tagsFor(beat: Beat): Tags {
	const now = beat.facts.filter((f) => !isHistory(f));
	if (now.length) return tagsOf(now);
	return Object.fromEntries(
		beat.facts.map((f) => [f.claim.key.replace(/^was:/, ''), f.claim.value])
	);
}

/** Older names of something still there, oldest first, with when each last held. */
export const oldNames = (beat: Beat) =>
	beat.facts
		.filter((f) => isHistory(f) && f.claim.key === 'was:name')
		.sort((a, b) => (a.observed ?? '').localeCompare(b.observed ?? ''))
		.map((f) => ({ name: f.claim.value, asOf: f.observed }));

function describeBeat(beat: Beat, place: string, weather: readonly Fact[] = []): string {
	const tags = tagsFor(beat);
	const sentences: string[] = [];
	const use = currentUse(tags);

	if (isElsewhereOnly(beat)) {
		const label = tags['wikidata:label'];
		const what = tags['wikidata:description'];
		return `${place}, by another account, is “${label}”${what ? `, “${what}”` : ''}.`;
	}
	if (beat.effects.includes('remembered')) {
		const asOf = beat.facts.find((f) => f.observed)?.observed;
		const sky = weatherThatDay(weather, asOf);
		return [
			`${lead(place)} there was ${nounPhrase(tags)}, in ${monthYear(asOf)}. The map no longer has it.`,
			sky
		]
			.filter(Boolean)
			.join(' ');
	}
	if (use && beat.effects.includes('tense-slip')) {
		const where = address(tags);
		const at = where ? ` at ${where}` : '';
		const observed = beat.facts.find((f) => f.observed && !isElsewhere(f))?.observed;
		sentences.push(
			`${lead(place)} there’s ${article(use)}${at}. There was ${article(use)} in ${monthYear(observed)}, when it was last recorded.`
		);
		const sky = weatherThatDay(weather, observed);
		if (sky) sentences.push(sky);
	} else {
		sentences.push(`${lead(place)} is ${nounPhrase(tags)}.`);
	}
	if (tags.name && !namedInline(tags)) sentences.push(`“${tags.name}”, it says.`);
	const past = pastUse(tags);
	if (past) sentences.push(`It was ${article(past)}.`);
	if (tags.old_name) sentences.push(`Once “${tags.old_name}”.`);
	const older = oldNames(beat);
	if (tags.name && older.length === 1)
		sentences.push(
			`“${tags.name}”, or “${older[0].name}”, as it was in ${monthYear(older[0].asOf)}.`
		);
	else if (tags.name && older.length > 1)
		sentences.push(
			`“${tags.name}”, ${older.map((o) => `or “${o.name}” (${monthYear(o.asOf)})`).join(', ')}.`
		);
	const listed = tags['wikidata:description'];
	const begun = tags['wikidata:inception'];
	if (listed)
		sentences.push(
			`Elsewhere it is listed as “${listed}”${begun ? `, begun ${when(begun)}` : ''}.`
		);
	else if (begun) sentences.push(`Elsewhere it is said to have begun ${when(begun)}.`);
	return sentences.join(' ');
}

/** "in 1868", "in May 1868", "on 1 May 1868": a date as precise as it was given. */
function when(date: string): string {
	if (date.length === 10) return `on ${longDate(date)}`;
	return date.length === 7 ? `in ${monthYear(date)}` : `in ${date}`;
}

/** A thing only another account places here: the map does not link to it. */
const isElsewhereOnly = (beat: Beat) => beat.subject.startsWith('wikidata/');

/** Another account of something the map has, seen without the map's own facts: not a thing to speak of. */
export const isHalf = (beat: Beat) => !isElsewhereOnly(beat) && beat.facts.every(isElsewhere);

export function exitsLine(exits: readonly SceneExit[]): string {
	if (!exits.length) return 'There is no way on from here.';
	const each = exits.map((e) => {
		const street = e.street ?? 'a path';
		if (!e.towards) return `${e.label} (${street})`;
		return e.towards === 'a dead end'
			? `${e.label} (${street}, a dead end)`
			: `${e.label} (${street}, towards ${e.towards})`;
	});
	return `Exits: ${each.join('; ')}.`;
}

function thing(beat: Beat): Thing {
	const tags = tagsFor(beat);
	const past = pastUse(tags);
	const name =
		tags.name ??
		tags['wikidata:label'] ??
		(currentUse(tags) || !past ? noun(tags) : `former ${past}`);
	const words = [
		name,
		noun(tags),
		past,
		tags['addr:housenumber'],
		tags.old_name,
		tags['wikidata:label'],
		...oldNames(beat).map((o) => o.name),
		'building'
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
		.split(/[^\p{L}\p{N}-]+/u)
		.filter((w) => w.length > 1 && !['the', 'at', 'of', 'and'].includes(w));
	const observed = beat.facts.find((f) => f.observed);
	const record = (facts: Fact[]) => facts.map((f) => `${f.claim.key}=${f.claim.value}`).join(' · ');
	const map = beat.facts.filter((f) => !isElsewhere(f));
	const elsewhere = beat.facts.filter(isElsewhere);
	const description = [
		map.length ? `${capitalise(nounPhrase(tags))}.` : `“${name}”.`,
		map.length ? `The map has it as: ${record(map)}.` : 'The map does not have it.',
		elsewhere.length ? `Elsewhere: ${record(elsewhere)}.` : '',
		observed
			? `Last ${isHistory(observed) ? 'recorded' : observed.observedBy === 'survey' ? 'surveyed' : 'edited'} in ${monthYear(observed.observed)}.`
			: ''
	];
	return {
		id: beat.subject,
		name,
		aliases: [...new Set(words)],
		description: description.filter(Boolean).join(' ')
	};
}
