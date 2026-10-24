import { groupBySubject } from '../facts';
import { bearing, compassLabel, nearestOnPolyline, type LatLon } from '../geo';
import type { Tags } from '../osm';
import type { Scene, SceneExit } from '../scene';
import type { Beat } from '../slippage';
import type { Renderer, Room, Thing } from './renderer';
import {
	address,
	article,
	capitalise,
	currentUse,
	humanise,
	list,
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
		const street = tagsOf([...groupBySubject(scene.street).values()][0] ?? []);
		const paragraphs = [
			[whereYouStand(scene, street), ...streetCharacter(street)].join(' '),
			...whatYouSee(scene),
			exitsLine(scene.exits)
		];
		if (scene.mood === 'hesitant') paragraphs.splice(-1, 0, pick(scene.stopId, HESITATIONS));
		return {
			title: title(scene, street),
			paragraphs: paragraphs.filter(Boolean),
			things: scene.beats.map(thing)
		};
	}
}

const HESITATIONS = [
	'Beyond that… nothing I can put a name to.',
	'There’s — no. Nothing else. Nothing else here.',
	'I had thought there was more along here — apparently not. Apparently not.'
];

const LOST_THREADS = ['And — where was I.', 'And so on, and so on. Where was I.'];

const streetName = (scene: Scene, street: Tags) =>
	scene.here[0] ?? `an unnamed ${humanise(street.highway)}`;

const isDeadEnd = (scene: Scene) => scene.kind === 'junction' && scene.exits.length === 1;

function title(scene: Scene, street: Tags): string {
	if (scene.here.length >= 2) return list(scene.here);
	const name = capitalise(streetName(scene, street));
	return isDeadEnd(scene) ? `End of ${name}` : name;
}

function whereYouStand(scene: Scene, street: Tags): string {
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

function streetCharacter(street: Tags): string[] {
	const sentences: string[] = [];
	if (street.surface) sentences.push(`${capitalise(humanise(street.surface))} underfoot.`);
	const lit = street.lit === 'yes' ? 'Lit at night' : street.lit === 'no' ? 'Unlit' : undefined;
	const pavement =
		street.sidewalk && (SIDEWALKS[street.sidewalk] ?? `pavement: ${street.sidewalk}`);
	if (lit && pavement) sentences.push(`${lit}, with ${pavement}.`);
	else if (lit || pavement) sentences.push(`${capitalise((lit ?? pavement)!)}.`);
	if (street.maxspeed) sentences.push(`The limit is ${street.maxspeed}, for what that is worth.`);
	return sentences;
}

function whatYouSee(scene: Scene): string[] {
	if (scene.mood === 'rambling') {
		const items = scene.beats.map((b) => noun(tagsOf(b.facts)));
		return [`Around you: ${list(items)}. ${pick(scene.stopId, LOST_THREADS)}`];
	}
	return scene.beats.map((b) => describeBeat(scene.position, b));
}

/** "To the north, a few steps away" */
function placement(from: LatLon, beat: Beat): string {
	const { point, metres } = nearestOnPolyline(from, beat.facts[0].geometry);
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
	const use = currentUse(tags);
	if (use) return use;
	const built = tags.building;
	if (!built || built === 'yes') return 'building';
	return BUILDING_NOUNS.has(built) ? humanise(built) : `${humanise(built)} building`;
}

function nounPhrase(tags: Tags): string {
	const where = address(tags);
	const at = where ? ` at ${where}` : '';
	const name = currentUse(tags) && tags.name ? `, “${tags.name}”` : '';
	return `${article(noun(tags))}${at}${name}`;
}

function describeBeat(from: LatLon, beat: Beat): string {
	const tags = tagsOf(beat.facts);
	const place = placement(from, beat);
	const sentences: string[] = [];
	const use = currentUse(tags);

	if (use && beat.effects.includes('tense-slip')) {
		const where = address(tags);
		const at = where ? ` at ${where}` : '';
		const observed = beat.facts.find((f) => f.observed)?.observed;
		sentences.push(
			`${place}, there’s ${article(use)}${at}. There was ${article(use)}${at} in ${monthYear(observed)}, the last time anyone looked.`
		);
	} else {
		sentences.push(`${place}, is ${nounPhrase(tags)}.`);
	}
	if (tags.name && !use) sentences.push(`“${tags.name}”, it says.`);
	const past = pastUse(tags);
	if (past) sentences.push(`It was ${article(past)}.`);
	if (tags.old_name) sentences.push(`Once “${tags.old_name}”.`);
	if (beat.effects.includes('spoken-as-found'))
		sentences.push('That is the whole of it, as written.');
	return sentences.join(' ');
}

function exitsLine(exits: readonly SceneExit[]): string {
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
	const tags = tagsOf(beat.facts);
	const past = pastUse(tags);
	const name = tags.name ?? (currentUse(tags) || !past ? noun(tags) : `former ${past}`);
	const words = [name, noun(tags), past, tags['addr:housenumber'], tags.old_name, 'building']
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
		.split(/[^\p{L}\p{N}-]+/u)
		.filter((w) => w.length > 1 && !['the', 'at', 'of', 'and'].includes(w));
	const observed = beat.facts.find((f) => f.observed);
	const record = beat.facts.map((f) => `${f.claim.key}=${f.claim.value}`).join(' · ');
	const description = [
		`${capitalise(nounPhrase(tags))}.`,
		`The map has it as: ${record}.`,
		observed
			? `Last ${observed.observedBy === 'survey' ? 'surveyed' : 'edited'} in ${monthYear(observed.observed)}.`
			: ''
	];
	return {
		id: beat.subject,
		name,
		aliases: [...new Set(words)],
		description: description.filter(Boolean).join(' ')
	};
}
