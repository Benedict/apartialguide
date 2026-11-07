import { distance, distanceToPolyline } from '../geo';
import { groupBySubject, type Fact } from '../facts';
import type { Tags } from '../osm';
import type { Scene } from '../scene';
import { looksBroken } from '../tensions';
import { noun } from './adventure';

/**
 * An Easy Read telling of a place, after Mencap's guidance: one short sentence to a line, everyday
 * words, a picture beside each, the ways on as a list. A spike, beside the template and Guide:
 * it says less than they do, never more, and every name in it is the map's, as found. A name that
 * reads as broken, or a thing it cannot say plainly, is left out rather than mended.
 */
export interface EasyLine {
	text: string;
	/** An OpenMoji picture (CC BY-SA 4.0), by its Unicode code point. */
	picture: string;
	/** A way on, as a button: the place it leads to, and its arrow in degrees from north. */
	go?: { to: string; arrow: number };
}

/** What a place is to someone coming to it: what to call it, and whether the way ends there. */
export interface Ahead {
	/** What it could be called, most use first: its tram stop, its streets, its named things. */
	names: string[];
	end?: boolean;
}

/** The pictures, by what they show: OpenMoji code points. */
export const PICTURES = {
	where: '1F4CD',
	ways: '1F9ED',
	end: '1F6A7',
	tram: '1F68A',
	bus: '1F68F',
	pub: '1F37A',
	cafe: '2615',
	restaurant: '1F37D',
	fastfood: '1F35F',
	shop: '1F3EA',
	house: '1F3E0',
	building: '1F3E2',
	church: '26EA',
	school: '1F3EB',
	library: '1F4DA',
	health: '1F3E5',
	pharmacy: '1F48A',
	park: '1F333',
	bench: '1FA91',
	postbox: '1F4EE',
	plaque: '1FAA7'
} as const;

/** The most things told at a place. */
const MOST_THINGS = 4;
/** How near a named tram stop is told as the place a tram platform is. */
const TRAM_STOP_WITHIN_M = 30;

const HOUSES = new Set([
	'house',
	'residential',
	'terrace',
	'detached',
	'semidetached_house',
	'bungalow'
]);

/** The picture for a thing, if it has one; a thing without one is not told unless named. */
function pictureOf(t: Tags): string | undefined {
	if (t.railway === 'tram' || t.railway === 'tram_stop' || (t.railway === 'platform' && t.tram))
		return PICTURES.tram;
	if (t.highway === 'bus_stop') return PICTURES.bus;
	const a = t.amenity;
	if (a === 'pub' || a === 'bar') return PICTURES.pub;
	if (a === 'cafe') return PICTURES.cafe;
	if (a === 'restaurant') return PICTURES.restaurant;
	if (a === 'fast_food') return PICTURES.fastfood;
	if (a === 'place_of_worship') return PICTURES.church;
	if (a === 'school' || a === 'college' || a === 'kindergarten') return PICTURES.school;
	if (a === 'library') return PICTURES.library;
	if (a === 'doctors' || a === 'dentist' || a === 'clinic' || a === 'hospital')
		return PICTURES.health;
	if (a === 'pharmacy') return PICTURES.pharmacy;
	if (a === 'bench') return PICTURES.bench;
	if (a === 'post_box') return PICTURES.postbox;
	if (t.shop) return PICTURES.shop;
	if (t.leisure === 'park' || t.leisure === 'garden' || t.leisure === 'playground')
		return PICTURES.park;
	if (t.natural === 'tree') return PICTURES.park;
	if (t.historic === 'memorial' || t.memorial === 'plaque') return PICTURES.plaque;
	if (t.building && HOUSES.has(t.building)) return PICTURES.house;
	if (t.building) return PICTURES.building;
	return undefined;
}

/** Everyday words for the map's kinds where they are not everyday: a reworded kind, never a name. */
const EVERYDAY: Record<string, string> = {
	'retail area': 'shopping area',
	bookmaker: 'betting shop',
	'residential area': 'housing area',
	'commercial area': 'business area',
	'convenience shop': 'corner shop'
};
const everyday = (kind: string) => EVERYDAY[kind] ?? kind;

const article = (word: string) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);
const plural = (word: string) => (/(s|x|ch|sh)$/.test(word) ? `${word}es` : `${word}s`);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tagsOf = (facts: readonly Fact[]): Tags =>
	Object.fromEntries(facts.map((f) => [f.claim.key, f.claim.value]));

/** The named tram stop a tram platform here belongs to, if the map names one near. */
function tramStop(scene: Scene): string | undefined {
	const isPlatform = (t: Tags) => t.railway === 'platform' || t.public_transport === 'platform';
	const underfoot = [...groupBySubject(scene.street).values()].map(tagsOf).some(isPlatform);
	const here = [...scene.beats, ...scene.hidden].some((b) => {
		const line = b.facts.find((f) => f.geometry?.length)?.geometry;
		return isPlatform(tagsOf(b.facts)) && !!line && distanceToPolyline(scene.position, line) <= 3;
	});
	if (!underfoot && !here) return undefined;
	for (const b of [...scene.beats, ...scene.hidden]) {
		const t = tagsOf(b.facts);
		const at = b.facts.find((f) => f.geometry?.length)?.geometry?.[0];
		if (
			t.railway === 'tram_stop' &&
			t.name &&
			at &&
			distance(scene.position, at) <= TRAM_STOP_WITHIN_M
		)
			return t.name;
	}
	return undefined;
}

/** Where you are: on a street, at its end, where two meet, or at a tram stop. */
function where(scene: Scene): EasyLine {
	const stop = tramStop(scene);
	if (stop) return { text: `You are at ${stop} tram stop.`, picture: PICTURES.tram };
	const names = scene.here.filter((n) => !looksBroken(n));
	const name = names[0] ?? 'a path';
	if (scene.kind === 'junction' && scene.exits.length === 1)
		return { text: `You are at the end of ${name}.`, picture: PICTURES.where };
	if (names.length >= 2)
		return { text: `You are where ${names[0]} and ${names[1]} meet.`, picture: PICTURES.where };
	return { text: `You are on ${name}.`, picture: PICTURES.where };
}

/** What is here: named things by name, the unnamed counted by kind, nearest first, four at most. */
function things(scene: Scene, stop?: string): EasyLine[] {
	const lines: EasyLine[] = [];
	const counted = new Map<string, { n: number; picture: string; at: number }>();
	let trams = false;
	let within: EasyLine | undefined;
	for (const b of scene.beats) {
		const t = tagsOf(b.facts);
		const picture = pictureOf(t);
		// A tram line: trams run here, whatever the line's name on the map.
		if (t.railway === 'tram') {
			if (!trams) lines.push({ text: 'Trams run here.', picture: PICTURES.tram });
			trams = true;
			continue;
		}
		// At a tram stop, its platform and the stop itself are where you are, not things here.
		if (
			stop &&
			(t.railway === 'platform' ||
				t.public_transport === 'platform' ||
				((t.railway === 'tram_stop' || t.public_transport === 'stop_position') && t.name === stop))
		)
			continue;
		if (SETTLEMENTS.has(t.place ?? '') && t.name && !looksBroken(t.name)) {
			within ??= { text: `You are in ${t.name}.`, picture: PICTURES.where };
			continue;
		}
		const words = t['plaque:inscription'];
		if (words) {
			lines.push({
				text: `There is a plaque here. It says: “${words}”.`,
				picture: PICTURES.plaque
			});
			continue;
		}
		const kind = everyday(noun(t));
		if (kind === 'something' || kind === 'address') continue;
		if (t.name && !looksBroken(t.name)) {
			lines.push({
				text: `There is ${article(kind)} here. It is called ${t.name}.`,
				picture: picture ?? PICTURES.where
			});
		} else if (!t.name && picture) {
			const c = counted.get(kind);
			if (c) c.n++;
			else counted.set(kind, { n: 1, picture, at: lines.length });
		}
	}
	// Each count stands where the first of its kind did.
	const all = [...lines.map((l, i) => ({ l, at: i }))];
	for (const [kind, { n, picture, at }] of counted)
		all.push({
			l: {
				text: n === 1 ? `There is ${article(kind)} here.` : `There are ${n} ${plural(kind)} here.`,
				picture
			},
			at: at - 0.5
		});
	const told = all
		.sort((a, b) => a.at - b.at)
		.slice(0, MOST_THINGS)
		.map(({ l }) => l);
	// The place you are in is said first, after where you stand.
	return within ? [within, ...told] : told;
}

/** The ways on, one to a line. */
const POINTS = [
	'north',
	'north-north-east',
	'north-east',
	'east-north-east',
	'east',
	'east-south-east',
	'south-east',
	'south-south-east',
	'south',
	'south-south-west',
	'south-west',
	'west-south-west',
	'west',
	'west-north-west',
	'north-west',
	'north-north-west'
];

/** An exit's arrow, in degrees from north, from the compass point it is named by. */
export const arrowOf = (label: string) => POINTS.indexOf(label.replace(/\s*\(.*$/, '')) * 22.5;

/** Places the map names that a walker is in, not beside. */
const SETTLEMENTS = new Set(['suburb', 'neighbourhood', 'quarter', 'village', 'town']);

const ofTramStop = (name: string) => (/tram stop$/i.test(name) ? name : `${name} tram stop`);

/**
 * What a place is to someone coming to it, from its own data: the tram stop it is at, else the
 * first named thing it tells, else its street; and whether the way ends there.
 */
export function comingTo(scene: Scene): Ahead {
	const stop = tramStop(scene) ?? nearTramStop(scene);
	const named = scene.beats
		.map((b) => tagsOf(b.facts))
		.filter(
			(t) => t.name && !looksBroken(t.name) && t.railway !== 'tram' && !t.highway && !!pictureOf(t)
		)
		.map((t) => t.name);
	const names = [
		...(stop ? [ofTramStop(stop)] : []),
		...scene.here.filter((h) => !looksBroken(h)),
		...named
	];
	return {
		names: [...new Set(names)],
		...(scene.kind === 'junction' && scene.exits.length === 1 ? { end: true } : {})
	};
}

/** Every name a place already tells, so a way on is not said to come to one of them. */
const toldAt = (scene: Scene) =>
	new Set([...comingTo(scene).names, ...scene.beats.map((b) => tagsOf(b.facts).name ?? '')]);

/** A tram stop the map names close by, though the place is not on its platform. */
function nearTramStop(scene: Scene): string | undefined {
	for (const b of scene.beats) {
		const t = tagsOf(b.facts);
		const at = b.facts.find((f) => f.geometry?.length)?.geometry?.[0];
		if (
			t.railway === 'tram_stop' &&
			t.name &&
			at &&
			distance(scene.position, at) <= TRAM_STOP_WITHIN_M
		)
			return t.name;
	}
	return undefined;
}

function ways(scene: Scene, ahead?: (to: string) => Ahead | undefined): EasyLine[] {
	const along = (street?: string) => (street && !looksBroken(street) ? street : 'a path');
	const told = toldAt(scene);
	if (scene.kind === 'junction' && scene.exits.length === 1)
		return [
			{
				text: `You can only go back: ${scene.exits[0].label}.`,
				picture: PICTURES.end,
				go: { to: scene.exits[0].to, arrow: arrowOf(scene.exits[0].label) }
			}
		];
	return [
		{ text: 'You can go:', picture: PICTURES.ways },
		...scene.exits.map((e) => {
			const way = along(e.street);
			const next = ahead?.(e.to);
			const said = [`${capitalise(e.label)}.`, `Along ${way}.`];
			if (next?.end)
				said.push(`The ${e.street && way === e.street ? 'street' : 'path'} ends there.`);
			else {
				const name = next?.names.find((n) => n !== e.street && !told.has(n));
				if (name) said.push(`You will come to ${name}.`);
			}
			return {
				text: said.join(' '),
				picture: PICTURES.ways,
				go: { to: e.to, arrow: arrowOf(e.label) }
			};
		})
	];
}

/** A place told in Easy Read. */
export function easyRead(scene: Scene, ahead?: (to: string) => Ahead | undefined): EasyLine[] {
	return [where(scene), ...things(scene, tramStop(scene)), ...ways(scene, ahead)];
}
