import { zoneLines } from '../render/zones';
import { COLOURS, isColour, type Colour } from './colours';
import type { Fact } from '../facts';
import { skyLine } from '../render/sky';
import { weatherNow } from '../render/weather';
import { airNow } from '../render/air';
import { departuresLine } from '../render/departures';
import { disruptionLines } from '../render/disruptions';
import { beyondLine } from '../render/beyond';
import { lightingNow } from '../render/lighting';
import { sunPosition } from '../astronomy';
import { cameraLines, flightsLine, planetsLine, satellitesLine } from '../render/overhead';
import {
	flightFacts,
	planetFacts,
	satelliteFacts,
	type Aircraft,
	type Omm
} from '../adapters/overhead';
import { distanceWords, longDate, monthYear, numberWord } from '../render/words';

export { distanceWords };
import { alludedTo } from '../keepers';
import { direction, parse } from './parser';
import type { Telling, Thing } from '../render/renderer';
import { distance, type LatLon } from '../geo';
import { postcodeOf } from './postcodes';
import { arcOf, circleThrough, FAR, offCurve, walkable, type Circle } from './circle';
import { AUTO, SLOTS, type SaveStore, type SavedWalk, type WalkState } from './saves';
import { drawWalks } from './drawing';
import { MemoryTrails, type TrailKeeper } from './trails';
import { FeedbackForm, NOT_OPEN, sentReply, type Feedback, type FeedbackContext } from './feedback';
import { freshWalk, keepWalk, pickUpWalk, type Walk } from './walk';
import type { StopId } from '../stops';
import { MemoryHints, type HintKeeper, type HintMemory } from './hints';
import { goalsFor, planRoute, routeIndex, routeWords, type RouteIndex } from './route';
import type { AdventureWorld, CompiledExit, Ledger, Term, TransitStop } from './world';

export interface Reply {
	/** Set when the reply describes a place. */
	title?: string;
	lines: string[];
	/** Somewhere to go beyond the page, such as this place on a map. */
	link?: { href: string; text: string };
	/** A place to show on a map, where the page can. */
	map?: { latitude: number; longitude: number; label: string };
	/** A word about a command the reader has not used yet: the page's, not Guide's. */
	hint?: string;
	/** The colours the page should take, and keep, as the reader asked. */
	theme?: Colour;
	/** True to keep the map beside the walk, moved to `map` at each stop; false to put it away. */
	follow?: boolean;
	/** Commands to offer as buttons, as well as to type. */
	actions?: { label: string; command: string }[];
	/** What the page should ask after, from the reader's browser, and hand back. */
	ask?: 'overhead' | 'camera' | 'news';
	/** A picture to show, such as what a camera saw. */
	image?: { src: string; alt: string };
	/** The walk drawn (`draw my walk`): an SVG of plain lines, for the page to show as it is. */
	drawing?: string;
	/** Feedback the reader has seen and said yes to: the page sends it, then tells `sent`. */
	send?: Feedback;
}

/** What `help` adds in the page's voice: what the walk uses, and where to ask for something to be taken out. */
export const removalHint = ({ email, page }: { email: string; page?: string }) =>
	`Everything here comes from open data: the map and public records of places. To have something about you or your home taken out, write to ${email}${page ? `, as ${page} says` : ''}.`;

export const HELP =
	'Type a direction to walk: north, ne, go east, or the name of a street; back retraces your step. ' +
	'Look (l) tells the place again in full, and plainly tells it from the map alone; explore finds what I have not mentioned; examine (x) a thing or a street to look closer. ' +
	'Take a name, or ask me to remember or mark down one, and drop it somewhere else; inventory (i) says what you carry. ' +
	'Areas lists the areas you can begin in; start in an area by its name begins a walk there, start at a place by its name, its postcode, or its latitude and longitude begins there, and start anywhere somewhere by chance. ' +
	'Place a glass sets a circle down to walk round, and keeps a record of it; glass off lifts it. Draw my walk draws the line you have walked, and draw all my walks every one. ' +
	'Save 1 to save 5 keeps the walk; restore picks one up. ' +
	'Drift, and I choose the way. Hint for a word about a command; hints off, or on, for one now and then. ' +
	'Route to a street or a named place for the way there (route off to let it go). ' +
	'Follow, then a river’s name, walks its course as the map draws it, saying where it shows and where it runs hidden (river off to let it go). ' +
	'Exits, weather, look up at what passes overhead, use the camera nearest here, look beyond the map, news for what is said today of the place, gps for this place on a map (gps on to keep the map beside you, gps off to put it away), score for how far you have walked, wait (z), again (g), verbose or brief, and feedback to send word to those who made me.';

/** What is not said again if heard at either of the last two places: framing lines among them. */
const RATIONED = ['street', 'setting', 'thing', 'nearest', 'frame'];

/** The page's caution, where the map marks ways into mines: said once, before the walk begins. */
export const MINES_CAUTION =
	'Old mine shafts, adits and levels are dangerous. This walk reads the records of the mines; it is not a guide to the ground. Keep away from them.';

/** The caution, on a world whose map marks ways into mines. */
const cautioned = (about?: Ledger) => (about?.mines ? { hint: MINES_CAUTION } : {});

/**
 * Guide's welcome, from the head of the world alone: who Guide is, what the walk is, and that the
 * map may be wrong. The figures wait for anyone who asks what Guide carries (`i`).
 */
export function introduction({
	asOf,
	about,
	place
}: Pick<AdventureWorld, 'asOf' | 'about' | 'place'>): Reply {
	const told = about?.accounts.length ? 'the map and the records others keep say' : 'the map says';
	const through = place ? `through ${place}` : 'round';
	return {
		lines: [
			`Hello. I’m Guide. I’ll walk you ${through}, telling you what ${told} of each place we stand.`,
			`${asOf ? `The map I carry is dated ${longDate(asOf)}. Some of it` : 'Some of what I tell'} will be out of date, or wrong, or missing. I tell it as I find it.`
		],
		...cautioned(about)
	};
}

export const OFFER = 'Shall we begin? Type take the tour.';
/** The tour, offered as a button as well as to type. */
/** How many other areas the start offers by name before it offers one choice of them all. */
const FEW_DOORS = 2;
const TAKE_TOUR = [{ label: 'Take the tour', command: 'take the tour' }];
const TOUR = /^(take the tour|take tour|the tour|tour|yes|begin|start)$/;

/** Moves after collecting a fragment before it can come back, and how many come back in a walk. */
/** What is said on taking a name, and on asking Guide to mark one down. */
interface Said {
	taken: (name: string) => string;
	thing: (name: string) => string;
	already: (name: string) => string;
}
const TAKEN: Said = {
	taken: (name) => `Taken: ${quote(name)}.`,
	thing: (name) => `You cannot take ${name}. I take its name, ${quote(name)}, for you.`,
	already: (name) => `You already carry ${quote(name)}.`
};
const MARKED: Said = {
	taken: (name) => `I mark it down: ${quote(name)}.`,
	thing: (name) => `I mark it down: ${quote(name)}.`,
	already: (name) => `I have it marked down already: ${quote(name)}.`
};

/** Commands worth knowing, each hinted at once at most, and only before the reader has used it. */
const HINTS: [verb: string, hint: string][] = [
	['gps', 'type gps to see this place on a map.'],
	['drift', 'type drift to let the walk choose the way.'],
	['route', 'type route to, then a street or a place, for the way there.'],
	['overhead', 'type look up for the sky over this place now.'],
	['camera', 'type use the camera for what the nearest traffic camera last saw.'],
	['plainly', 'type plainly to hear this place again from the records alone.'],
	['remember', 'type remember, then a name, and it may come back to you later.'],
	['follow', 'type gps on to keep a map beside the walk.'],
	['examine', 'type examine, then a thing, to look closer.'],
	['save', 'type save 1 to keep this walk.'],
	['glass', 'type place a glass for a circle to walk round.'],
	['river', 'type follow, then a river’s name, to walk its course.'],
	['start', 'type start anywhere to begin somewhere by chance.'],
	['news', 'type news for what is said today of the place.'],
	['draw', 'type draw my walk to see the line you have walked.']
];
/** How far from the nearest place a latitude and longitude may lie, and still be on the map. */
const NEAR_ENOUGH = 500;
/** Steps between one hint and the next. */
const HINT_EVERY = 8;

const RECALL_AFTER = 4;
const RECALLS = 2;
/** How likely a fragment is to come back, at a stop where one may. */
const RECALL_CHANCE = 0.25;
/** Guide's words around a fragment come back. They never say where it was found. */
const RECALLED = [
	(f: string) => `“${f}”.`,
	(f: string) => `I find I am still carrying “${f}”.`,
	(f: string) => `“${f}”, again. Or still.`
];

/** Moves between two names before chance may set them side by side, and how often it may in a walk. */
const CONNECT_AFTER = 3;
const CONNECTIONS = 2;
const CONNECT_CHANCE = 1 / 3;

/** How many rivers are named when asked which; past that, the nearest so many. */
const FEW_RIVERS = 5;
/** How much further than straight across the way to a river's next place may be, before it is passed over. */
const RIVER_DETOUR = 3;
/** Below this many metres, any way to a river's next place is near enough. */
const RIVER_DETOUR_MIN = 200;

/** The distances that mark a walk, in metres: the goal is to walk, and each is told once passed. */
const MARKS = [250, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000];

/** Guide's account of what they carry: the map, the other accounts, the areas. Every figure is the data's. */
function ledgerLines(asOf: string, about: Ledger): string[] {
	const n = (x: number) => x.toLocaleString('en-GB');
	const oldest = about.oldest
		? `, the oldest of them last recorded in ${monthYear(about.oldest)}`
		: '';
	const lines = [
		`I carry a map dated ${longDate(asOf)}: ${n(about.streets)} named streets and ${n(about.places)} places to stand${oldest}. Beyond it there may be more. I could not say what.`
	];
	if (about.accounts.length)
		lines.push(
			`The map is not the only account. Others have been kept: by ${alludedTo(about.accounts)}. Where they disagree with the map, I leave them disagreeing.`
		);
	const areas = about.areas;
	if (areas && areas.count > 1)
		lines.push(
			`The map runs into ${n(areas.count)} ${areas.kind}s${areas.most.length ? `, most of it in ${listed(areas.most)}` : ''}. I will say when we cross from one to another.`
		);
	return lines;
}

/** A distance as Guide says it: tens of metres under a kilometre, then tenths of a kilometre. */
/** “A”, “A” and “B”, or “A”, “B” and “C”. */
const listed = (names: readonly string[]) =>
	names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const quote = (name: string) => `“${name}”`;

/** Where the walk stands: the place, the steps taken and how far they came to. */
export interface Status {
	place: string;
	moves: number;
	/** Metres walked, between where the map puts each stop. */
	walked: number;
}

/** A reader's walk through a compiled world. */
export class Adventure {
	/** True between the introduction and the tour. */
	private choosing = false;
	/** Chance, for what comes back: Math.random unless a test fixes it. */
	chance: () => number = Math.random;
	/** Which form of the opening was said last, so the next place opens another way. */
	private whereForm = -1;
	/** Today's weather and the sky, as the browser found them when the walk began. */
	private now: Fact[] = [];
	/** The disruptions on the roads already told this walk, so each is told once. */
	private disruptionsTold = new Set<string>();
	/** What the hints remember across walks: the browser's, given by the page, or memory. */
	hintKeeper: HintKeeper = new MemoryHints();
	/** The move at which a hint last came of its own, this walk; and which hint comes next when asked. */
	private hintedAt?: number;
	private hintTurn = 0;
	/** Where walks are kept, if anywhere; the walk keeps itself in its own slot after each command. */
	saves?: SaveStore;
	clock: () => Date = () => new Date();
	/** Where every walk's line is kept between visits: the browser's, given by the page, or memory. */
	trails: TrailKeeper = new MemoryTrails();
	/** Whether the page has somewhere to send feedback (`FEEDBACK_URL`). */
	feedbackOpen = false;
	/** Where a resident asks for something to be taken out (`REMOVAL_EMAIL`), and the page saying how. */
	removal?: { email: string; page?: string };
	/** The kind of device and browser, as the page found them: shown with feedback, and sent only with it. */
	context: FeedbackContext = {};
	/** Feedback being asked, while it is. */
	private form?: FeedbackForm;

	/** Everything the walk remembers, kept with it when it is saved (`walk.ts`). */
	private walk: Walk;

	constructor(
		private readonly world: AdventureWorld,
		here = world.start
	) {
		this.walk = freshWalk(here);
	}

	/** Where the walk stands. */
	get here(): string {
		return this.walk.here;
	}

	set here(id: string) {
		this.walk.here = id;
	}

	/**
	 * The rest of the start, once the map is open: today, when there is word of it, and the tour.
	 * The page says the introduction first, while the map is still being opened.
	 */
	offer(now: Fact[] = []): Reply[] {
		this.choosing = true;
		this.now = now;
		const today = [weatherNow(now), airNow(now), skyLine(now)].filter(Boolean).join(' ');
		return [...(today ? [{ lines: [today] }] : []), this.offering()];
	}

	/**
	 * The tour, offered with the other ways in where the map has them: each open area but the
	 * tour's own, a walk begun by chance, and, as the page's word, what else may be typed.
	 */
	private offering(): Reply {
		const others = (this.world.doors ?? []).filter((d) => d.stop && d.stop !== this.world.start);
		// A few areas are offered by name; more, behind one choice, so the start stays short.
		const doors =
			others.length > FEW_DOORS
				? [{ label: 'Choose an area', command: 'areas' }]
				: others.map((d) => ({ label: `Start in ${d.name}`, command: `start in ${d.name}` }));
		const chance = this.world.anywhere?.length
			? [{ label: 'Start anywhere', command: 'start anywhere' }]
			: [];
		return {
			lines: [OFFER],
			actions: [...this.continuing(), ...TAKE_TOUR, ...doors, ...chance],
			...(this.world.doors?.length
				? { hint: 'Or type start at, then a postcode, a street or a place.' }
				: {})
		};
	}

	/** The areas open to walk, each a button that begins there; and those not open yet, named quietly. */
	private areas(): Reply {
		const doors = this.world.doors ?? [];
		const open = doors.filter((d) => d.stop);
		const shut = doors.filter((d) => !d.stop).map((d) => d.name);
		if (!open.length) return { lines: ['The map I carry is all one place.'] };
		return {
			lines: ['Where shall we begin?'],
			actions: open.map((d) => ({ label: d.name, command: `start in ${d.name}` })),
			...(shut.length ? { hint: `Not open yet: ${shut.join(', ')}.` } : {})
		};
	}

	/** The start of the walk: Guide introduces themselves and offers the tour. */
	begin(now: Fact[] = []): Reply[] {
		this.choosing = true;
		this.now = now;
		const today = [weatherNow(now), airNow(now), skyLine(now)].filter(Boolean).join(' ');
		const welcome = introduction(this.world);
		return [{ ...welcome, lines: [...welcome.lines, ...(today ? [today] : [])] }, this.offering()];
	}

	/** The place nearest a latitude and longitude given as "51.38, -0.07", and how far it is. */
	private nearestTo(where: string): { id: StopId; metres: number } | undefined {
		const m = where.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
		const index = m && this.index();
		if (!m || !index) return undefined;
		const p: LatLon = [Number(m[1]), Number(m[2])];
		let best: { id: StopId; metres: number } | undefined;
		for (const [id, stop] of Object.entries(index.stops)) {
			if (!stop.at) continue;
			const metres = distance(p, stop.at);
			if (!best || metres < best.metres) best = { id, metres };
		}
		return best;
	}

	/** A place by a name found there, a thing's or a street's, as a way to it is found. */
	private named(name: string): [StopId, string] | undefined {
		const index = this.index();
		if (!index) return undefined;
		return [...goalsFor(index, name)][0];
	}

	private door(where: string) {
		return this.world.doors?.find((d) => d.name.toLowerCase() === where.toLowerCase());
	}

	/** A walk begun afresh: in an area, at its first place, or at a place a shared link names. */
	/** Where `start anywhere` will begin, chosen when the page asks what to open, so it is open. */
	private chosen?: StopId;

	/** A place worth beginning at, by chance; the tour's start where the map holds none. */
	private somewhere(): StopId {
		const pool = this.world.anywhere ?? [];
		return pool.length ? pool[Math.floor(this.chance() * pool.length)] : this.world.start;
	}

	private start(where: string, at?: boolean): Reply {
		if (where === 'anywhere' && !at) {
			const id = this.chosen ?? this.somewhere();
			this.chosen = undefined;
			const reply = this.afresh(id);
			return { ...reply, lines: ['Somewhere, then.', ...reply.lines] };
		}
		if (at && this.world.stops[where]) return this.afresh(where);
		const door = this.door(where);
		const code = at && !door ? postcodeOf(where) : undefined;
		if (code) {
			const id = this.world.postcodes?.[code];
			if (!id || !this.world.stops[id])
				return { lines: [`I have no place for ${code} on my map.`] };
			const reply = this.afresh(id);
			return { ...reply, lines: [`We begin at ${code}.`, ...reply.lines] };
		}
		const near = at && !door ? this.nearestTo(where) : undefined;
		if (near) {
			if (near.metres > NEAR_ENOUGH || !this.world.stops[near.id])
				return { lines: ['That is beyond my map. The nearest place I have is far from there.'] };
			const reply = this.afresh(near.id);
			return { ...reply, lines: [`We begin at the place nearest ${where}.`, ...reply.lines] };
		}
		if (at && !door) {
			const named = this.named(where);
			if (!named || !this.world.stops[named[0]]) return { lines: ['That place is not on my map.'] };
			const reply = this.afresh(named[0]);
			return { ...reply, lines: [`We begin at ${quote(named[1])}.`, ...reply.lines] };
		}
		const open = (this.world.doors ?? []).filter((d) => d.stop);
		if (!door) {
			const names = open.map((d) => d.name);
			return {
				lines: [
					`I know of nowhere by that name to begin.${
						names.length
							? ` I can begin in ${names.slice(0, -1).join(', ')}${names.length > 1 ? ' or ' : ''}${names.at(-1)}.`
							: ''
					}`
				],
				actions: open.map((d) => ({ label: d.name, command: `start in ${d.name}` }))
			};
		}
		if (!door.stop)
			return {
				lines: [`I carry no map of ${door.name} yet.`],
				hint: `${door.name} is not open yet.`,
				...(this.world.signup
					? { link: { href: this.world.signup, text: `Hear when ${door.name} opens` } }
					: {})
			};
		const reply = this.afresh(door.stop);
		return { ...reply, lines: [`We begin in ${door.name}.`, ...reply.lines] };
	}

	/** A new walk from here: nothing walked, no way asked for, no step to go back on. */
	private afresh(id: string): Reply {
		this.walk.moves = 0;
		this.walk.walked = 0;
		this.walk.route = undefined;
		this.walk.lastStreet = undefined;
		return this.beginAt(id);
	}

	private beginAt(id: string): Reply {
		this.choosing = false;
		this.walk.here = id;
		this.walk.previous = undefined;
		// A walk begun afresh is a new line; one picked up goes on with its own.
		if (!this.walk.moves) {
			this.walk.id = undefined;
			this.walk.trail = [];
		}
		this.mark();
		return this.arrive();
	}

	/** A button to pick up the walk kept from before, on this map, if there is one. */
	private continuing(): { label: string; command: string }[] {
		const kept = this.saves?.get(AUTO);
		if (!kept || kept.version !== 1) return [];
		return [
			{
				label: `Continue the walk (${kept.place}${kept.walked > 0 ? `, ${distanceWords(kept.walked)}` : ''})`,
				command: `restore ${AUTO}`
			}
		];
	}

	/** The page's colours, as the reader asked, or which there are. */
	private colour(colour?: string): Reply {
		if (!colour || !isColour(colour))
			return {
				lines: [
					`The screen can be ${COLOURS.slice(0, -1).join(', ')} or ${COLOURS.at(-1)}: say “colour green”.`
				]
			};
		return {
			lines: [colour === 'paper' ? 'The screen turns as it was.' : `The screen turns ${colour}.`],
			theme: colour
		};
	}

	/** Hints on or off, on this walk and the next. */
	private hints(on: boolean): Reply {
		this.remember((m) => {
			m.off = !on;
		});
		return { lines: [on ? 'Hints on.' : 'Hints off.'] };
	}

	private choose(input: string): Reply {
		const command = parse(input);
		if (command.verb === 'restore') return this.restore(command.slot);
		if (command.verb === 'start') return this.start(command.where, command.at);
		if (command.verb === 'areas') return this.areas();
		// The page's own settings answer before the walk begins as after it.
		if (command.verb === 'colour') return this.colour(command.colour);
		if (command.verb === 'hints') return this.hints(command.on);
		const words = input
			.trim()
			.toLowerCase()
			.replace(/[.!?]+$/, '');
		if (!words) return { lines: [] };
		return TOUR.test(words)
			? this.beginAt(this.world.start)
			: { lines: [OFFER], actions: TAKE_TOUR };
	}

	look(): Reply {
		const stop = this.world.stops[this.walk.here];
		return { title: stop.title, lines: this.inFull(stop) };
	}

	/** The place again from the template alone, where prose was told instead. */
	private plainly(): Reply {
		const stop = this.world.stops[this.walk.here];
		return stop.plain
			? { title: stop.title, lines: this.inFull(stop.plain) }
			: { lines: ['I have told it plainly already.'] };
	}

	/** A telling in full, its lighting as the template gave it said again for the hour. */
	private inFull({ paragraphs, parts }: Telling): string[] {
		const lit = (parts ?? []).flat().filter((p) => p.lit);
		return paragraphs.map((line) =>
			lit.reduce((said, p) => said.replace(p.text, this.saidNow(p)), line)
		);
	}

	/** A part as said now: the street's lighting by the hour, worked out for where the map puts it. */
	private saidNow(p: { text: string; lit?: 'yes' | 'no'; pavement?: string }): string {
		const at = this.position();
		if (!p.lit || !at) return p.text;
		const sun = sunPosition(this.clock(), at.latitude, at.longitude).altitude;
		return lightingNow(p.lit, p.pavement, sun, this.walk.moves);
	}

	/** Where the walk stands, for a status line. */
	status(): Status {
		return {
			place: this.world.stops[this.walk.here].title,
			moves: this.walk.moves,
			walked: this.walk.walked
		};
	}

	respond(input: string): Reply {
		if (this.form) return this.asked(input);
		if (parse(input).verb === 'feedback') return this.feedback();
		const reply = this.answer(input);
		if (!this.choosing && this.saves) this.keep(AUTO);
		return reply;
	}

	/** True while feedback is being asked: what is typed is the reader's answer, not a command. */
	get asking(): boolean {
		return !!this.form;
	}

	private feedback(): Reply {
		if (!this.feedbackOpen) return NOT_OPEN;
		const begun = !this.choosing || this.walk.moves > 0;
		this.form = new FeedbackForm({
			place: begun ? (this.world.stops[this.walk.here]?.title ?? '') : '',
			moves: this.walk.moves,
			...(this.world.asOf ? { map: this.world.asOf } : {}),
			...this.context
		});
		return this.form.first();
	}

	private asked(input: string): Reply {
		const reply = this.form!.answer(input);
		if (this.form!.done) this.form = undefined;
		return reply;
	}

	/** What the page says once feedback has gone, or has not. */
	sent(ok: boolean): Reply {
		return sentReply(ok);
	}

	private answer(input: string): Reply {
		if (this.choosing) return this.choose(input);
		const command = parse(input);
		if (command.verb === 'again')
			return this.walk.lastCommand === undefined
				? { lines: ['You have done nothing yet to do again.'] }
				: this.answer(this.walk.lastCommand);
		if (command.verb !== 'empty') this.walk.lastCommand = input;
		this.remember((m) => {
			if (!m.used.includes(command.verb)) m.used.push(command.verb);
		});
		switch (command.verb) {
			case 'empty':
				return { lines: [] };
			case 'start':
				return this.start(command.where, command.at);
			case 'glass':
				return command.on ? this.glass() : this.lift();
			case 'river':
				return command.off ? this.leaveRiver() : this.takeRiver(command.target ?? '');
			case 'look':
				return this.look();
			case 'plainly':
				return this.plainly();
			case 'explore':
				return this.explore();
			case 'help':
				return { lines: [HELP], ...(this.removal ? { hint: removalHint(this.removal) } : {}) };
			case 'weather':
				return {
					lines: [
						[
							weatherNow(this.now) ?? 'I have no word of the weather today.',
							airNow(this.now),
							skyLine(this.now)
						]
							.filter(Boolean)
							.join(' ')
					]
				};
			case 'gps':
				return this.gps();
			case 'follow':
				return this.follow(command.on);
			case 'route':
				return { lines: command.target ? this.route(command.target) : this.unroute() };
			case 'overhead':
				return this.lookUp();
			case 'camera':
				return { lines: [], ask: 'camera' };
			case 'areas':
				return this.areas();
			case 'feedback':
				return this.feedback();
			case 'draw':
				return this.draw(command.all);
			case 'news':
				return { lines: [], ask: 'news' };
			case 'beyond':
				return { lines: [this.beyond()] };
			case 'exits':
				return { lines: [this.exits()] };
			case 'back':
				return this.walk.previous
					? this.moveTo(this.walk.previous)
					: { lines: ['You haven’t come from anywhere yet.'] };
			case 'go':
				return this.go(command.direction);
			case 'examine':
				return this.examine(command.target);
			case 'wait':
				return { lines: ['Time passes. Not much else does.'] };
			case 'verbose':
				this.walk.verbose = true;
				return { lines: ['I will tell every place in full, however often you come back to it.'] };
			case 'brief':
				this.walk.verbose = false;
				return { lines: ['Brief, then: a place in full the first time, and briefly after.'] };
			case 'score':
				return { lines: [this.score()] };
			case 'drift':
				return this.drift();
			case 'hints':
				return this.hints(command.on);
			case 'hint':
				return { lines: [], hint: this.askedHint() };
			case 'colour':
				return this.colour(command.colour);
			case 'magic':
				return { lines: ['Nothing happens. Nothing has happened here for some time.'] };
			case 'inventory':
				return { lines: this.inventory() };
			case 'save':
				return this.save(command.slot);
			case 'restore':
				return this.restore(command.slot);
			case 'take':
				return { lines: [this.take(command.target)] };
			case 'remember':
				return { lines: [this.take(command.target, MARKED)] };
			case 'drop':
				return { lines: [this.drop(command.target)] };
			case 'unknown':
				return {
					lines: [
						`I don’t know the word “${command.text.split(/\s+/)[0]}”. Type help to see what I understand.`
					]
				};
		}
	}

	private exits(): string {
		const stop = this.world.stops[this.walk.here];
		return (
			stop.paragraphs.find((p) => p.startsWith('Exits:')) ??
			`Exits: ${stop.exits.map((e) => e.label).join(', ')}.`
		);
	}

	private go(where: string): Reply {
		const exits = this.world.stops[this.walk.here].exits;
		const matches = matchExits(exits, where);
		if (matches.length === 1)
			return matches[0].closed ? this.edge(matches[0].closed) : this.moveTo(matches[0].to);
		if (matches.length > 1)
			return { lines: [`Which way: ${matches.map((e) => e.label).join(' or ')}?`] };
		return {
			lines: [
				direction(where)
					? `You can’t go ${where} from here.`
					: `There’s no way to ${where} from here.`
			]
		};
	}

	/** The edge of what is open: Guide goes no further, and the page names the area to come. */
	private edge(area: string): Reply {
		return {
			lines: ['The map I carry stops there.'],
			hint: `${area} is not open yet.`,
			...(this.world.signup
				? { link: { href: this.world.signup, text: `Hear when ${area} opens` } }
				: {})
		};
	}

	private moveTo(to: string): Reply {
		const from = this.world.stops[this.walk.here].at;
		const at = this.world.stops[to].at;
		const before = this.walk.walked;
		if (from && at) this.walk.walked += distance(from, at);
		this.walk.previous = this.walk.here;
		this.walk.here = to;
		this.walk.moves++;
		this.mark();
		const arrived = this.arrive();
		const round = [...this.roundOn(), ...this.riverOn()];
		const reply = round.length ? { ...arrived, lines: [...arrived.lines, ...round] } : arrived;
		const passed = MARKS.filter((m) => m > before && m <= this.walk.walked).at(-1);
		const hint = this.hint();
		return {
			...reply,
			...(passed ? { lines: [...reply.lines, `You have walked ${distanceWords(passed)}.`] } : {}),
			...(hint ? { hint } : {})
		};
	}

	/** Where the map puts the stop come to, added to the walk's line and kept with every walk's. */
	private mark(): void {
		const at = this.world.stops[this.walk.here]?.at;
		if (!at) return;
		const last = this.walk.trail.at(-1);
		if (last && last[0] === at[0] && last[1] === at[1]) return;
		this.walk.trail.push([at[0], at[1]]);
		this.walk.id ??= `${this.clock().getTime().toString(36)}-${Math.floor(this.chance() * 1e9).toString(36)}`;
		this.trails.put(this.walk.id, this.walk.trail);
	}

	/** The reader's walk drawn, or all their walks kept: plain lines, and no word from Guide. */
	private draw(all: boolean): Reply {
		const kept = all
			? [...this.trails.load()].filter(([id]) => id !== this.walk.id).map(([, t]) => t)
			: [];
		const drawing = drawWalks([...kept, this.walk.trail]);
		return drawing
			? { lines: [], drawing }
			: { lines: [], hint: 'Walk a little first: there is no line to draw yet.' };
	}

	/** Now and then, a command the reader has not used yet, once each, on any walk. */
	private hint(): string | undefined {
		const memory = this.hintKeeper.load();
		if (memory.off) return undefined;
		if (this.hintedAt !== undefined && this.walk.moves - this.hintedAt < HINT_EVERY)
			return undefined;
		const next = this.unhinted(memory);
		if (!next) return undefined;
		this.remember((m) => m.given.push(next[0]));
		this.hintedAt = this.walk.moves;
		return `Hint: ${next[1]}`;
	}

	/** A hint when asked: one not given yet, or else each in turn. Asked for, it comes even with hints off. */
	private askedHint(): string {
		const next = this.unhinted(this.hintKeeper.load());
		if (next) {
			this.remember((m) => m.given.push(next[0]));
			return `Hint: ${next[1]}`;
		}
		const [, text] = HINTS[this.hintTurn++ % HINTS.length];
		return `Hint: ${text}`;
	}

	private unhinted(memory: HintMemory) {
		return HINTS.find(([verb]) => !memory.used.includes(verb) && !memory.given.includes(verb));
	}

	/** Changes the hints' memory, and keeps it. */
	private remember(change: (memory: HintMemory) => void): void {
		const memory = this.hintKeeper.load();
		change(memory);
		this.hintKeeper.save(memory);
	}

	/**
	 * The places a command needs open before it is answered, for a world opened as the walk goes:
	 * where a kept walk stood, to restore it; otherwise here, where you came from and where the exits lead.
	 */
	needs(input: string): StopId[] {
		const command = parse(input);
		if (command.verb === 'again')
			return this.walk.lastCommand ? this.needs(this.walk.lastCommand) : [];
		if (command.verb === 'start') {
			if (command.where === 'anywhere') return [(this.chosen = this.somewhere())];
			const door = this.door(command.where);
			if (door?.stop) return [door.stop];
			if (!command.at) return [];
			if (this.world.stops[command.where] || /:/.test(command.where)) return [command.where];
			const code = postcodeOf(command.where);
			if (code) return this.world.postcodes?.[code] ? [this.world.postcodes[code]] : [];
			const near = this.nearestTo(command.where);
			if (near) return near.metres <= NEAR_ENOUGH ? [near.id] : [];
			const named = this.named(command.where);
			return named ? [named[0]] : [];
		}
		if (command.verb === 'restore') {
			const kept = command.slot ? this.saves?.get(command.slot)?.state : undefined;
			return kept ? [kept.here, ...(kept.previous ? [kept.previous] : [])] : [];
		}
		const stop = this.world.stops[this.walk.here];
		return [
			...new Set([
				this.walk.here,
				...(this.walk.previous ? [this.walk.previous] : []),
				...(stop?.exits.filter((e) => !e.closed).map((e) => e.to) ?? [])
			])
		];
	}

	/** Which map this is, kept with a saved walk for the record; a walk is picked up wherever its place still is. */
	private mapId(): string {
		// Counted by the account, not by what is open: a world opened as the walk goes has few stops at first.
		const places = this.world.about?.places ?? Object.keys(this.world.stops).length;
		return `${this.world.asOf ?? ''}|${this.world.start}|${places}`;
	}

	/** The walk as plain data, to keep. */
	snapshot(): SavedWalk {
		const state = keepWalk(this.walk);
		return {
			version: 1,
			map: this.mapId(),
			savedAt: this.clock().toISOString(),
			place: this.world.stops[this.walk.here].title,
			walked: this.walk.walked,
			moves: this.walk.moves,
			state
		};
	}

	private keep(slot: string): SavedWalk {
		const walk = this.snapshot();
		try {
			this.saves?.put(slot, walk);
		} catch {
			// A browser that will keep nothing more loses the save, never the walk.
		}
		return walk;
	}

	private save(slot?: string): Reply {
		const saves = this.saves;
		if (!saves) return { lines: ['I have nowhere to keep a walk here.'] };
		if (!slot)
			return {
				lines: ['Save in which slot?'],
				actions: SLOTS.map((s) => {
					const kept = saves.get(s);
					return {
						label: kept ? `${s}: ${kept.place}, ${distanceWords(kept.walked)}` : `${s}: empty`,
						command: `save ${s}`
					};
				})
			};
		if (!SLOTS.includes(slot))
			return { lines: [`There are slots ${SLOTS[0]} to ${SLOTS.at(-1)}.`] };
		const walk = this.keep(slot);
		const moves = `${walk.moves} move${walk.moves === 1 ? '' : 's'}`;
		return {
			lines: [`Saved in slot ${slot}: ${walk.place}, ${distanceWords(walk.walked)}, ${moves}.`]
		};
	}

	private restore(slot?: string): Reply {
		const saves = this.saves;
		if (!saves) return { lines: ['I have nowhere a walk could be kept.'] };
		if (!slot) {
			const kept = [AUTO, ...SLOTS]
				.map((s) => ({ s, walk: saves.get(s) }))
				.filter((k): k is { s: string; walk: SavedWalk } => k.walk?.version === 1);
			if (!kept.length) return { lines: ['There is no walk kept to restore.'] };
			return {
				lines: ['Restore which walk?'],
				actions: kept.map(({ s, walk }) => ({
					label: `${s === AUTO ? 'Last walk' : s}: ${walk.place}, ${distanceWords(walk.walked)}`,
					command: `restore ${s}`
				}))
			};
		}
		if (slot !== AUTO && !SLOTS.includes(slot))
			return { lines: [`There are slots ${SLOTS[0]} to ${SLOTS.at(-1)}.`] };
		const walk = saves.get(slot);
		if (!walk)
			return {
				lines: [slot === AUTO ? 'There is no walk kept to continue.' : `Slot ${slot} is empty.`]
			};
		if (walk.version !== 1)
			return { lines: ['That walk was on another map. I cannot pick it up on this one.'] };
		// Stops are named by the map's own ways and nodes, so a walk outlives a newer map wherever
		// the place it stood is still on it.
		if (!this.world.stops[walk.state.here])
			return {
				lines: ['The place that walk stood is no longer on my map. I cannot pick it up there.'],
				actions: TAKE_TOUR
			};
		this.load(this.within(walk.state));
		const place = this.look();
		const said = slot === AUTO ? 'We go on from where we were.' : `Restored from slot ${slot}.`;
		return this.followed({ ...place, lines: [said, ...place.lines] });
	}

	/** A kept walk, without the places this map no longer has: where it came from, and a way it asked for. */
	private within(state: WalkState): WalkState {
		const has = (id: string) => !!this.world.stops[id];
		const goals = state.route?.goals.filter(([id]) => has(id));
		return {
			...state,
			previous: state.previous && has(state.previous) ? state.previous : undefined,
			route: state.route && goals?.length ? { ...state.route, goals } : undefined,
			// A circle goes on only if the map still has every point of it.
			circle: state.circle?.points.every(has) ? state.circle : undefined,
			// So does a river, followed on a map that still has every place along it.
			river: state.river?.points.every((p) => has(p.stop)) ? state.river : undefined
		};
	}

	private load(state: WalkState): void {
		this.choosing = false;
		this.walk = pickUpWalk(state);
	}

	private score(): string {
		const moves = `${this.walk.moves} move${this.walk.moves === 1 ? '' : 's'}`;
		const next = MARKS.find((m) => m > this.walk.walked);
		const mark = next
			? ` The next mark is ${distanceWords(next)}.`
			: ' You have passed every mark I know.';
		return `You have walked ${distanceWords(this.walk.walked)} in ${moves}.${mark}`;
	}

	/** What the reader carries, what Guide still carries, and the map and accounts Guide walks by. */
	private inventory(): string[] {
		const { asOf, about } = this.world;
		return [this.carried(), ...(asOf && about ? ledgerLines(asOf, about) : [])];
	}

	private carried(): string {
		const yours = this.walk.pocket.length
			? `You are carrying ${listed(this.walk.pocket.map(quote))}.`
			: 'You are carrying nothing. Names, perhaps, if you take them.';
		// What Guide carries is told once it has come back, never where it was found.
		const mine = [...this.walk.recalled].filter((n) => !this.walk.pocket.includes(n));
		return mine.length ? `${yours} I am still carrying ${listed(mine.map(quote))}.` : yours;
	}

	/** Takes a name: of something left here, a broken name spoken here, or a thing here. Never the thing. */
	private take(target: string, said: Said = TAKEN): string {
		const stop = this.world.stops[this.walk.here];
		const words = target.toLowerCase().split(/\s+/);
		const means = (name: string) => words.every((w) => name.toLowerCase().includes(w));
		const left = this.walk.left.get(this.walk.here) ?? [];
		const name =
			left.find(means) ??
			(stop.fragments ?? []).find(means) ??
			this.visibleThings().find((t) => words.every((w) => t.aliases.includes(w)))?.name;
		if (!name) return `You see no ${target} here.`;
		if (this.walk.pocket.includes(name)) return said.already(name);
		this.walk.pocket.push(name);
		if (!this.walk.carried.has(name))
			this.walk.carried.set(name, { at: this.walk.here, move: this.walk.moves });
		if (left.includes(name)) {
			this.walk.left.set(
				this.walk.here,
				left.filter((n) => n !== name)
			);
			return said.taken(name);
		}
		return (stop.fragments ?? []).includes(name) ? said.taken(name) : said.thing(name);
	}

	private drop(target: string): string {
		const words = target.toLowerCase().split(/\s+/);
		const name = this.walk.pocket.find((n) => words.every((w) => n.toLowerCase().includes(w)));
		if (!name) return 'You are not carrying that.';
		this.walk.pocket.splice(this.walk.pocket.indexOf(name), 1);
		this.walk.left.set(this.walk.here, [...(this.walk.left.get(this.walk.here) ?? []), name]);
		return `You leave ${quote(name)} here.`;
	}

	/** The things here a reader can see: told, or found by exploring; not the land they stand on. */
	private visibleThings(): Thing[] {
		const stop = this.world.stops[this.walk.here];
		const found = this.walk.explored.has(this.walk.here) ? (stop.hidden?.things ?? []) : [];
		return [...stop.things, ...found].filter(
			(t, i, all) => !t.background && all.findIndex((o) => o.name === t.name) === i
		);
	}

	/** A place returned to: its name, what can be seen, and the ways on. */
	private brief(): Reply {
		const stop = this.world.stops[this.walk.here];
		const names = this.visibleThings().map((t) => withArticle(t.name));
		this.walk.heard = [...this.walk.heard, []].slice(-2);
		this.walk.lastStreet = undefined;
		return {
			title: stop.title,
			lines: [...(names.length ? [`You can see ${listed(names)} here.`] : []), this.exits()]
		};
	}

	/** A place reached: told, and now and then a name the reader asked to be kept comes back. */
	private arrive(): Reply {
		const told =
			this.walk.visited.has(this.walk.here) && !this.walk.verbose ? this.brief() : this.told();
		this.walk.visited.add(this.walk.here);
		const left = (this.walk.left.get(this.walk.here) ?? []).map(
			(n) => `${quote(n)} lies here, where you left it.`
		);
		const crossed = [this.crossing(), ...this.zoning(), ...this.underfoot()].filter(
			(l): l is string => !!l
		);
		const reply = crossed.length ? { ...told, lines: [...crossed, ...told.lines] } : told;
		const stop = this.world.stops[this.walk.here];
		const back = this.recall(stop.fragments ?? []) ?? this.connect(stop.terms ?? []);
		for (const t of stop.terms ?? [])
			this.walk.met.set(t.term, [
				...(this.walk.met.get(t.term) ?? []),
				{ said: t.said, at: this.walk.here, move: this.walk.moves, street: t.street }
			]);
		const lines = [...reply.lines];
		const exits =
			lines.length && lines.at(-1)!.startsWith('Exits:') ? lines.length - 1 : lines.length;
		const way = this.wayOn();
		lines.splice(exits, 0, ...left, ...(back ? [back] : []), ...(way ? [way] : []));
		return this.followed({ ...reply, lines });
	}

	/** The street network to plan a way across, given by the page, or worked out from a whole world. */
	routes?: RouteIndex;
	private index(): RouteIndex | undefined {
		const { about, stops } = this.world;
		if (!this.routes && (!about || Object.keys(stops).length >= about.places))
			this.routes = routeIndex(this.world);
		return this.routes;
	}

	/** Whether answering this needs the route index the page has not yet given. */
	needsRoutes(input: string): boolean {
		if (this.index()) return false;
		const command = parse(input);
		if (command.verb === 'glass') return command.on;
		// Beginning at a place by its name needs the names, which the street network carries.
		if (command.verb === 'start')
			return (
				!!command.at &&
				!this.world.stops[command.where] &&
				!/:/.test(command.where) &&
				!postcodeOf(command.where) &&
				!this.door(command.where)
			);
		if (command.verb === 'go' && this.walk.circle) return true;
		if (command.verb === 'river') return !command.off;
		if (command.verb === 'go' && this.walk.river) return true;
		if (command.verb === 'route') return !!command.target;
		if (command.verb === 'restore' && command.slot)
			return !!this.saves?.get(command.slot)?.state.route;
		return command.verb === 'go' && !!this.walk.route;
	}

	/**
	 * A step Guide chooses: by chance, but leaning towards what is odd in the data ahead (a broken
	 * name, a word met before, a place with something going on, a place not yet seen), never doubling
	 * back while there is another way. Guide says which way, never why.
	 */
	private drift(): Reply {
		const exits = this.world.stops[this.walk.here].exits.filter((e) => !e.closed);
		const onward = exits.filter((e) => e.to !== this.walk.previous);
		const ways = onward.length ? onward : exits;
		if (!ways.length) return { lines: ['There is nowhere to drift to.'] };
		const pull = (to: StopId) => {
			const there = this.world.stops[to];
			if (!there) return 1;
			return (
				1 +
				3 * (there.fragments?.length ?? 0) +
				((there.terms ?? []).some((t) => this.walk.met.has(t.term)) ? 2 : 0) +
				(there.plain ? 1 : 0) +
				(this.walk.visited.has(to) ? 0 : 1)
			);
		};
		const weights = ways.map((e) => pull(e.to));
		let r = this.chance() * weights.reduce((a, b) => a + b, 0);
		const way = ways.find((_, i) => (r -= weights[i]) < 0) ?? ways.at(-1)!;
		const reply = this.moveTo(way.to);
		return { ...reply, lines: [`You drift ${way.label}.`, ...reply.lines] };
	}

	/** The way to a named street or thing, along the streets, kept and said again at each stop. */
	private route(target: string): string[] {
		const index = this.index();
		if (!index) return ['I cannot find the way just now.'];
		const goals = goalsFor(index, target);
		const plan = planRoute(index, this.walk.here, goals);
		switch (plan.kind) {
			case 'unknown':
				return ['I know of nowhere by that name on my map.'];
			case 'here':
				return [`You are there already: ${quote(plan.to)}.`];
			case 'unreachable':
				return [`I know of no way from here to ${quote(plan.to)}.`];
			case 'way':
				this.walk.route = { to: plan.to, goals: [...goals] };
				return [routeWords(plan), 'I will say the way at each turn.'];
		}
	}

	private unroute(): string[] {
		const had = !!this.walk.route;
		this.walk.route = undefined;
		return [had ? 'I let the way go.' : 'There is no way I am keeping.'];
	}

	/** The way on from here, while one is kept: the next turn, or arrival, when it lets the way go. */
	private wayOn(): string | undefined {
		const index = this.walk.route && this.index();
		if (!this.walk.route || !index) return undefined;
		const plan = planRoute(index, this.walk.here, new Map(this.walk.route.goals));
		if (plan.kind === 'here') {
			this.walk.route = undefined;
			return `You are at ${quote(plan.to)}. That was the way.`;
		}
		if (plan.kind !== 'way') return undefined;
		const [next] = plan.legs;
		return `Your way to ${quote(this.walk.route.to)}: ${next.label}${next.street ? ` (${next.street})` : ''}.`;
	}

	/** A glass set down on the map, its edge through here, the centre off by chance: the circle to walk. */
	private glass(): Reply {
		const index = this.index();
		if (!index) return { lines: ['I cannot set a glass down just now.'] };
		// Chance turns the glass; of twelve turns from there, it is set where the streets go round best.
		const first = this.chance() * 360;
		const circle = Array.from({ length: 12 }, (_, i) =>
			circleThrough(index, this.walk.here, (first + i * 30) % 360)
		)
			.filter((c) => c !== undefined)
			.map((c) => ({ c, walked: walkable(index, c) }))
			.reduce<{ c: Circle; walked: number } | undefined>(
				(best, next) => (!best || next.walked > best.walked ? next : best),
				undefined
			)?.c;
		if (!circle) return { lines: ['The glass will not sit here: the streets do not go round.'] };
		this.walk.route = undefined;
		this.walk.circle = { ...circle, next: 1, record: [], seen: [], strayed: 0 };
		this.note(this.walk.here);
		const across = Math.round((circle.radius * 2) / 10) * 10;
		return {
			lines: [
				`A circle, about ${across} metres across. Its edge runs through where you stand.`,
				...this.turn()
			]
		};
	}

	private lift(): Reply {
		const had = !!this.walk.circle;
		this.walk.circle = undefined;
		return { lines: [had ? 'I lift the glass.' : 'There is no glass set down.'] };
	}

	/** What a place gives the record: its names as found, and the named things in it. Nothing new. */
	private note(id: StopId): void {
		const c = this.walk.circle;
		const stop = this.world.stops[id];
		if (!c || !stop) return;
		if (stop.at) c.strayed = Math.max(c.strayed, offCurve(c, stop.at));
		if (c.seen.includes(id)) return;
		c.seen.push(id);
		const found = (stop.fragments ?? []).map((f) => `“${f}”`);
		const named = stop.things
			.filter((t) => !t.background && /^[\p{Lu}\p{N}“"]/u.test(t.name))
			.slice(0, 2)
			.map((t) => t.name);
		// Each name once in the record, where it was first met.
		const words = [...new Set([...found, ...named])].filter(
			(w) => !c.record.some((line) => line.includes(w))
		);
		if (words.length) c.record.push(`${stop.title}: ${words.join('; ')}.`);
	}

	/** The next turn round the circle. */
	private turn(): string[] {
		const c = this.walk.circle;
		const index = this.index();
		if (!c || !index) return [];
		// A point the streets reach only far round is passed over: the way is kept to the curve, not to
		// every point on it.
		const arc = arcOf(c);
		let plan = planRoute(
			index,
			this.walk.here,
			new Map([[c.points[c.next % c.points.length], 'the circle']])
		);
		while (c.next < c.points.length && (plan.kind !== 'way' || plan.metres > FAR * arc)) {
			c.next++;
			plan = planRoute(
				index,
				this.walk.here,
				new Map([[c.points[c.next % c.points.length], 'the circle']])
			);
		}
		if (plan.kind !== 'way') return [];
		const [leg] = plan.legs;
		const done = c.next > 1 ? ` ${c.next - 1} of ${c.points.length}.` : '';
		return [`Your way round: ${leg.label}${leg.street ? ` (${leg.street})` : ''}.${done}`];
	}

	/** On arriving while a circle is walked: the record kept, the next turn, or the circle closed. */
	private roundOn(): string[] {
		const c = this.walk.circle;
		if (!c) return [];
		this.note(this.walk.here);
		const closing = c.next >= c.points.length;
		if (closing && this.walk.here === c.points[0]) {
			this.walk.circle = undefined;
			const strayed = Math.max(1, Math.round(c.strayed));
			return [
				'The circle is closed.',
				'The record:',
				...(c.record.length ? c.record : ['Nothing written down.']),
				`You kept within ${strayed} metre${strayed === 1 ? '' : 's'} of the curve.`
			];
		}
		// A point reached, or one further round, passed on the way.
		const reached = c.points.indexOf(this.walk.here, c.next);
		if (!closing && reached >= 0) c.next = reached + 1;
		return this.turn();
	}

	/** A river taken up by its name: its course from the place on it nearest here, the way it flows. */
	private takeRiver(target: string): Reply {
		const rivers = this.world.rivers ?? [];
		if (!rivers.length) return { lines: ['The map I carry has no river on it.'] };
		const here = this.world.stops[this.walk.here]?.at ?? this.index()?.stops[this.walk.here]?.at;
		const far = (stop: StopId) => {
			const at = this.world.stops[stop]?.at ?? this.index()?.stops[stop]?.at;
			return here && at ? distance(here, at) : Infinity;
		};
		// A few rivers are all named; more, the nearest few, so the answer stays short.
		const byNear = [...new Set(rivers.map((r) => r.name))]
			.map((name) => ({
				name,
				metres: Math.min(
					...rivers.filter((r) => r.name === name).flatMap((r) => r.points.map((p) => far(p.stop)))
				)
			}))
			.sort((a, b) => a.metres - b.metres)
			.map((r) => quote(r.name));
		const has =
			byNear.length > FEW_RIVERS
				? `Nearest here: ${listed(byNear.slice(0, FEW_RIVERS))}.`
				: `The map has ${listed(byNear)}.`;
		if (!target) return { lines: [`Which river? ${has}`] };
		const words = target.split(/\s+/).filter(Boolean);
		const matching = rivers.filter((r) => words.every((w) => r.name.toLowerCase().includes(w)));
		// Of its courses (two arms are two), the one with a place nearest here; and on it, that place.
		const nearest = matching
			.map((r) => {
				const at = r.points.reduce((a, p, i) => (far(p.stop) < far(r.points[a].stop) ? i : a), 0);
				return { r, at, metres: far(r.points[at].stop) };
			})
			.sort((a, b) => a.metres - b.metres)[0];
		if (!nearest) return { lines: [`I know of no river by that name. ${has}`] };
		const { r, at } = nearest;
		// From its last place, the only way along it is back up it.
		const upstream = at === r.points.length - 1 && r.points.length > 1;
		const points = upstream ? [...r.points].reverse() : r.points.map((p) => ({ ...p }));
		this.walk.route = undefined;
		this.walk.circle = undefined;
		this.walk.river = {
			name: r.name,
			points,
			next: upstream ? 0 : at,
			shown: 0,
			hid: 0,
			seen: []
		};
		const n = points.length;
		const lines = [
			`${quote(r.name)}, as the map draws it: ${numberWord(n)} ${n === 1 ? 'place' : 'places'} along it.`
		];
		return { lines: [...lines, ...this.riverOn()] };
	}

	private leaveRiver(): Reply {
		const r = this.walk.river;
		this.walk.river = undefined;
		return { lines: [r ? `I leave ${quote(r.name)} to itself.` : 'We are not following a river.'] };
	}

	/** At a place while a river is followed: whether it shows or runs hidden here, and the way on. */
	private riverOn(): string[] {
		const r = this.walk.river;
		if (!r) return [];
		const lines: string[] = [];
		const at = r.points.findIndex((p, i) => i >= r.next && p.stop === this.walk.here);
		if (at >= 0) {
			const p = r.points[at];
			if (!r.seen.includes(p.stop)) {
				r.seen.push(p.stop);
				if (p.hidden) r.hid++;
				else r.shown++;
			}
			const how = this.world.stops[this.walk.here].beneath?.find((b) => b.name === r.name)?.how;
			lines.push(
				p.hidden
					? `${quote(r.name)} runs hidden here${how ? `, ${how}` : ''}.`
					: `${quote(r.name)} shows here.`
			);
			r.next = at + 1;
		}
		const turn = r.next < r.points.length ? this.riverTurn() : [];
		if (turn.length) return [...lines, ...turn];
		// The end of the line the map draws, or none of what is left can be reached.
		this.walk.river = undefined;
		const places = (n: number) => `${numberWord(n)} ${n === 1 ? 'place' : 'places'}`;
		return [
			...lines,
			`As far as the map draws ${quote(r.name)}.`,
			!r.hid
				? `Along your way it showed at ${places(r.shown)}, and never ran hidden.`
				: !r.shown
					? `Along your way it never showed: it ran hidden under ${places(r.hid)}.`
					: `Along your way it showed at ${places(r.shown)}, and ran hidden under ${numberWord(r.hid)}.`
		];
	}

	/** The next turn along the river: to the next place on it the streets reach. */
	private riverTurn(): string[] {
		const r = this.walk.river;
		const index = this.index();
		if (!r || !index) return [];
		const here = index.stops[this.walk.here]?.at;
		while (r.next < r.points.length) {
			const target = r.points[r.next].stop;
			const plan = planRoute(index, this.walk.here, new Map([[target, r.name]]));
			// A place across the river the streets reach only far round is passed over, so the way
			// keeps to the river rather than crossing and recrossing it.
			const there = index.stops[target]?.at;
			const straight = here && there ? distance(here, there) : 0;
			const roundabout =
				plan.kind === 'way' && plan.metres > Math.max(RIVER_DETOUR_MIN, RIVER_DETOUR * straight);
			if (plan.kind === 'way' && !roundabout) {
				const [leg] = plan.legs;
				return [
					`Your way along ${quote(r.name)}: ${leg.label}${leg.street ? ` (${leg.street})` : ''}.`
				];
			}
			r.next++;
		}
		return [];
	}

	/** gps on keeps the map beside the walk, stop after stop; gps off puts it away. */
	private follow(on: boolean): Reply {
		this.walk.following = on;
		return on
			? this.followed({ lines: ['I will keep the map beside you as we go.'] })
			: { lines: ['I put the map away.'], follow: false };
	}

	/** A reply about a place, with the map moved to it while the reader keeps the map on. */
	private followed(reply: Reply): Reply {
		const stop = this.world.stops[this.walk.here];
		if (!this.walk.following || !stop.at) return reply;
		return {
			...reply,
			map: { latitude: stop.at[0], longitude: stop.at[1], label: stop.title },
			follow: true
		};
	}

	/** Where the map puts this stop, and a link to it on Google Maps: never where the reader is. */
	private gps(): Reply {
		const stop = this.world.stops[this.walk.here];
		const at = stop.at;
		if (!at) return { lines: ['I cannot say where this is on any map.'] };
		const [lat, lon] = at.map((n) => n.toFixed(5));
		return {
			lines: [`By the map, you are at ${lat}, ${lon}.`],
			map: { latitude: at[0], longitude: at[1], label: stop.title },
			link: {
				href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`,
				text: 'See it on Google Maps'
			}
		};
	}

	/** A step into or out of the zones another account draws over the map, each told once. */
	private zoning(): string[] {
		const before =
			this.walk.previous === undefined ? [] : (this.world.stops[this.walk.previous].zones ?? []);
		const now = this.world.stops[this.walk.here].zones ?? [];
		// A zone is its kind and its name: a mine's plans and its returns share a name.
		const key = (z: { name: string; kind: string }) => `${z.kind}|${z.name}`;
		const was = new Set(before.map(key));
		const is = new Set(now.map(key));
		return zoneLines(
			now.filter((z) => !was.has(key(z))),
			before.filter((z) => !is.has(key(z)))
		);
	}

	/** A step onto a river the map runs under the ground: told on coming onto it, not while it runs on. */
	private underfoot(): string[] {
		const before =
			this.walk.previous === undefined
				? []
				: (this.world.stops[this.walk.previous].beneath ?? []).map((b) => b.name);
		// A river being followed says for itself where it runs hidden.
		return (this.world.stops[this.walk.here].beneath ?? [])
			.filter((b) => !before.includes(b.name) && b.name !== this.walk.river?.name)
			.map((b) => `Under your feet, ${b.how}, runs “${b.name}”.`);
	}

	/** A step into, out of or between the areas another account draws, such as wards. */
	private crossing(): string | undefined {
		const from =
			this.walk.previous === undefined ? undefined : this.world.stops[this.walk.previous].area;
		const to = this.world.stops[this.walk.here].area;
		if (from?.name === to?.name) return undefined;
		// Said plainly, as a record: a ward is no thing the map shows, so its name carries its kind.
		const called = (a: { name: string; kind: string }) =>
			a.name.toLowerCase().endsWith(a.kind.toLowerCase()) ? a.name : `${a.name} ${a.kind}`;
		if (!from) return `You are in ${called(to!)}.`;
		return to ? `You leave ${called(from)} for ${called(to)}.` : `You leave ${called(from)}.`;
	}

	/** Where the map puts this place, for what is asked of it: never where the reader is. */
	position(): { latitude: number; longitude: number } | undefined {
		const at = this.world.stops[this.walk.here].at;
		return at ? { latitude: at[0], longitude: at[1] } : this.world.weatherAt;
	}

	/** The weather and the planets at once; the page then asks after what passes overhead. */
	private lookUp(): Reply {
		const sky = [weatherNow(this.now), airNow(this.now), skyLine(this.now)]
			.filter(Boolean)
			.join(' ');
		const planets = planetsLine(planetFacts(this.clock(), this.position()));
		return { lines: [sky, planets].filter((l): l is string => !!l), ask: 'overhead' };
	}

	/** What passes overhead, as the page found it: satellites worked out, aircraft as broadcast. */
	overhead(
		satellites: readonly Omm[] | undefined,
		flights: { ac?: Aircraft[] } | undefined
	): Reply | undefined {
		const at = this.position();
		const now = this.clock();
		const lines = [
			satellites && satellitesLine(satelliteFacts(satellites, now, at)),
			flights && flightsLine(flightFacts(flights, at, now.toISOString()))
		].filter((l): l is string => !!l);
		return lines.length ? { lines } : undefined;
	}

	/** What others keep beyond the map, from where the map puts this place; or owning to not knowing. */
	private beyond(): string {
		const at = this.world.stops[this.walk.here].at;
		return (
			(at && beyondLine(this.world.beyond ?? [], at)) ??
			'Beyond the map there may be more. I could not say what.'
		);
	}

	/** What the nearest camera saw, as the page found it; nothing happens without an answer. */
	camera(facts: readonly Fact[] | undefined): Reply {
		const at = this.world.stops[this.walk.here].at;
		if (!facts || !at) return { lines: ['Nothing happens.'] };
		return cameraLines(facts, at);
	}

	/** The bus and tram stops here that TfL has live arrivals for. */
	transitHere(): TransitStop[] {
		return this.world.stops[this.walk.here].transit ?? [];
	}

	/** Works and closures on the roads here, as the page found them; each told once a walk, nothing without an answer. */
	disruptions(facts: readonly Fact[] | undefined): Reply | undefined {
		if (!facts) return undefined;
		const fresh = facts.filter((f) => !this.disruptionsTold.has(f.subject));
		const lines = disruptionLines(fresh);
		if (!lines.length) return undefined;
		for (const f of fresh) this.disruptionsTold.add(f.subject);
		return { lines };
	}

	/** The day's news of the map's place, as the page found it: up to three headlines, as hearsay. */
	news(answer: { place?: string; articles?: { title: string }[] } | undefined): Reply {
		const titles = (answer?.articles ?? [])
			.map((a) => a.title)
			.filter(Boolean)
			.slice(0, 3);
		if (!answer?.place || !titles.length) return { lines: ['No news reaches me.'] };
		return {
			lines: titles.map((t, i) =>
				i === 0 ? `In today's news of ${answer.place}: “${t}”.` : `And: “${t}”.`
			)
		};
	}

	/** What is due at a stop, as TfL answered; nothing at all without an answer. */
	departures(stop: TransitStop, facts: Fact[] | undefined): Reply | undefined {
		if (!facts) return undefined;
		const line = departuresLine(facts, stop.name, stop.letter);
		return line ? { lines: [line] } : undefined;
	}

	/** A place as the reader arrives: what they heard at the last two places is not said again. */
	private told(): Reply {
		const stop = this.world.stops[this.walk.here];
		if (!stop.parts) return this.look();
		const recent = new Set(this.walk.heard.flat());
		// Prose cannot be cut; where it would say again most of what was just heard, the template can.
		const things = (stop.plain?.parts ?? [])
			.flat()
			.filter((p) => p.kind === 'thing')
			.flatMap((p) => p.key.split(' '));
		const heardThings = new Set([...recent].flatMap((k) => k.split(' ')));
		const repeats = things.filter((k) => heardThings.has(k)).length;
		const plainly = !!stop.plain?.parts && things.length > 0 && repeats * 2 >= things.length;
		const told = plainly ? stop.plain!.parts! : stop.parts;
		// What the prose tells, as the template would name it, so the next place does not repeat it.
		const heard: string[] = plainly
			? []
			: (stop.plain?.parts ?? []).flat().flatMap((p) => (RATIONED.includes(p.kind) ? [p.key] : []));
		let street: string | undefined;
		const lines = told
			.map((parts) => {
				const fresh = parts.filter((p) => !RATIONED.includes(p.kind) || !recent.has(p.key));
				const framesNothing =
					parts.some((p) => p.kind === 'thing') && !fresh.some((p) => p.kind === 'thing');
				return fresh
					.filter((p) => !(framesNothing && p.kind === 'frame'))
					.map((p) => {
						if (RATIONED.includes(p.kind)) heard.push(p.key);
						if (p.kind === 'where') {
							street = p.street;
							if (p.street && p.street === this.walk.lastStreet) return this.goOn(p.text);
							if (p.options) {
								this.whereForm = (this.whereForm + 1) % p.options.length;
								return p.options[this.whereForm];
							}
						}
						if (p.lit) return this.saidNow(p);
						return p.kind === 'frame' && p.options ? this.frame(p.options) : p.text;
					})
					.join(' ');
			})
			.filter(Boolean);
		this.walk.heard = [...this.walk.heard, heard].slice(-2);
		this.walk.lastStreet = street;
		return { title: stop.title, lines };
	}

	/** "You are standing on X…" again, when the reader has only gone on along X. */
	private goOn(where: string): string {
		const along = this.frame(['Further along ', 'Still on ']);
		return where.replace(/^You are standing on /, along);
	}

	/** A framing line put another way than last time. */
	private frame(options: readonly string[]): string {
		const key = options.join('|');
		const last = this.walk.framed.get(key);
		const next = options[(options.indexOf(last ?? '') + 1) % options.length];
		this.walk.framed.set(key, next);
		return next;
	}

	/** Two names that share a word, met in different places, set side by side if chance allows. */
	private connect(here: readonly Term[]): string | undefined {
		if (this.walk.connected.size >= CONNECTIONS) return undefined;
		for (const t of here) {
			if (this.walk.connected.has(t.term)) continue;
			const earlier = (this.walk.met.get(t.term) ?? []).find(
				(e) =>
					!e.said.toLowerCase().includes(t.said.toLowerCase()) &&
					!t.said.toLowerCase().includes(e.said.toLowerCase()) &&
					e.at !== this.walk.here &&
					this.walk.moves - e.move >= CONNECT_AFTER &&
					!(e.street && t.street)
			);
			if (!earlier) continue;
			if (this.chance() >= CONNECT_CHANCE) return undefined;
			this.walk.connected.add(t.term);
			return `“${t.said}”. Earlier, “${earlier.said}”.`;
		}
		return undefined;
	}

	/** A fragment carried long enough to come back here, out of place, if chance allows. */
	private recall(here: readonly string[]): string | undefined {
		if (this.walk.recalled.size >= RECALLS || here.length) return undefined;
		const ready = [...this.walk.carried].filter(
			([f, c]) =>
				!this.walk.recalled.has(f) &&
				c.at !== this.walk.here &&
				this.walk.moves - c.move >= RECALL_AFTER
		);
		if (!ready.length || this.chance() >= RECALL_CHANCE) return undefined;
		const [fragment] = ready[Math.floor(this.chance() * ready.length)];
		this.walk.recalled.add(fragment);
		return RECALLED[Math.floor(this.chance() * RECALLED.length)](fragment);
	}

	/** Whether Guide carries a name the words mean, one that has already come back. */
	private carrying(target: string): boolean {
		const words = target.toLowerCase().split(/\s+/);
		return [...this.walk.recalled].some((n) => words.every((w) => n.toLowerCase().includes(w)));
	}

	private explore(): Reply {
		const hidden = this.world.stops[this.walk.here].hidden;
		if (!hidden || this.walk.explored.has(this.walk.here))
			return { lines: ['You look around, and find nothing more than I have told you.'] };
		this.walk.explored.add(this.walk.here);
		return { lines: hidden.lines };
	}

	private examine(target: string): Reply {
		const stop = this.world.stops[this.walk.here];
		if (EVERYTHING.has(target)) return { lines: [this.whatToExamine()] };
		const words = target.split(/\s+/);
		const named = (among: Thing[]) =>
			among.filter((t) => words.every((w) => t.aliases.includes(w)));
		let things = named(stop.things);
		// Something unnoticed can still be found by naming it.
		if (things.length === 0 && stop.hidden) things = named(stop.hidden.things);
		if (things.length === 0) things = named(stop.streets ?? []);
		if (things.length === 0 && this.carrying(target)) return { lines: ['A name, as I found it.'] };
		if (things.length === 0) return { lines: [`You see no ${target} here.`] };
		if (things.length > 1 && !things.every((t) => t.name === things[0].name))
			return { lines: [`Which do you mean: ${things.map((t) => t.name).join(' or ')}?`] };
		return { lines: things.map((t) => t.description) };
	}

	/** What there is to examine here, by name: the street, and each thing told or found. */
	private whatToExamine(): string {
		const stop = this.world.stops[this.walk.here];
		const found = this.walk.explored.has(this.walk.here) ? (stop.hidden?.things ?? []) : [];
		const things = [...stop.things, ...found].filter(
			(t, i, all) => !t.background && all.findIndex((o) => o.name === t.name) === i
		);
		const names = things.map((t) => withArticle(t.name));
		const streets = (stop.streets ?? []).map((s) => s.name);
		if (!names.length)
			return streets.length
				? `There is nothing here to examine but ${streets.join(' and ')}.`
				: 'There is nothing here to examine.';
		const all = [...streets, ...names];
		return `You could examine ${all.length < 2 ? all[0] : `${all.slice(0, -1).join(', ')}, or ${all.at(-1)}`}.`;
	}
}

/** A name as it stands, or a kind of thing with its article. */
const withArticle = (name: string) =>
	/^[\p{Lu}\p{N}“]/u.test(name) ? name : `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;

/** What a reader means by examining everything, or nothing in particular. */
const EVERYTHING = new Set([
	'',
	'things',
	'thing',
	'everything',
	'all',
	'around',
	'stuff',
	'here things'
]);

/** Exits the reader could mean: an exact compass label, a label with a street after it, or a street name. */
function matchExits(exits: readonly CompiledExit[], where: string): CompiledExit[] {
	const exact = exits.filter((e) => e.label === where);
	if (exact.length) return exact;
	const qualified = exits.filter((e) => e.label.startsWith(`${where} (`));
	if (qualified.length) return qualified;
	return exits.filter((e) => e.street?.toLowerCase() === where);
}
