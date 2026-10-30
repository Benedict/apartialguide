import type { Fact } from '../facts';
import { hearsay } from '../render/hearsay';
import { skyLine } from '../render/sky';
import { weatherNow } from '../render/weather';
import { airNow } from '../render/air';
import { departuresLine } from '../render/departures';
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
import { distanceWords, longDate, monthYear } from '../render/words';

export { distanceWords };
import { alludedTo } from '../keepers';
import { direction, parse } from './parser';
import type { Telling, Thing } from '../render/renderer';
import { distance } from '../geo';
import { AUTO, SLOTS, type SaveStore, type SavedWalk, type WalkState } from './saves';
import type { AdventureWorld, CompiledExit, Ledger, Term, TransitStop } from './world';

export interface Reply {
	/** Set when the reply describes a place. */
	title?: string;
	lines: string[];
	/** Somewhere to go beyond the page, such as this place on a map. */
	link?: { href: string; text: string };
	/** A place to show on a map, where the page can. */
	map?: { latitude: number; longitude: number; label: string };
	/** Commands to offer as buttons, as well as to type. */
	actions?: { label: string; command: string }[];
	/** What the page should ask after, from the reader's browser, and hand back. */
	ask?: 'overhead' | 'camera';
	/** A picture to show, such as what a camera saw. */
	image?: { src: string; alt: string };
}

export const HELP =
	'Type a direction to walk: north, ne, go east, or the name of a street; back retraces your step. ' +
	'Look (l) tells the place again in full, and plainly tells it from the map alone; explore finds what I have not mentioned; examine (x) a thing or a street to look closer. ' +
	'Take a name and drop it somewhere else; inventory (i) says what you carry. ' +
	'Save 1 to save 5 keeps the walk; restore picks one up. ' +
	'Exits, weather, look up at what passes overhead, use the camera nearest here, look beyond the map, gps for this place on a map, score for how far you have walked, wait (z), again (g), and verbose or brief.';

/** What is not said again if heard at either of the last two places: framing lines among them. */
const RATIONED = ['street', 'setting', 'thing', 'nearest', 'frame'];

/** Guide's words about themselves, said once, before the first place. */
export const INTRO = [
	'I am Guide. I lived here long ago. I lived here yesterday. I will have lived here tomorrow.'
];

export const OFFER = 'Shall I show you round? Type take the tour, and we will begin.';
/** The tour, offered as a button as well as to type. */
const TAKE_TOUR = [{ label: 'Take the tour', command: 'take the tour' }];
const TOUR = /^(take the tour|take tour|the tour|tour|yes|begin|start)$/;

/** Moves after collecting a fragment before it can come back, and how many come back in a walk. */
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

/** The distances that mark a walk, in metres: the goal is to walk, and each is told once passed. */
const MARKS = [250, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000];

/** Guide's account of what they carry: the map, the other accounts, the areas. Every figure is the data's. */
function ledgerLines(asOf: string, about: Ledger): string[] {
	const n = (x: number) => x.toLocaleString('en-GB');
	const oldest = about.oldest
		? `, the oldest of them last recorded in ${monthYear(about.oldest)}`
		: '';
	const lines = [
		`I walk by a map. Mine is dated ${longDate(asOf)}: ${n(about.streets)} named streets and ${n(about.places)} places to stand${oldest}. Beyond it there may be more. I could not say what.`
	];
	if (about.accounts.length)
		lines.push(
			`The map is not the only account. Others have been kept: by ${alludedTo(about.accounts)}. Where they disagree with the map, I leave them disagreeing.`
		);
	const areas = about.areas;
	if (areas && areas.count > 1)
		lines.push(
			`${hearsay(`the map runs into ${n(areas.count)} ${areas.kind}s${areas.most.length ? `, most of it in ${listed(areas.most)}` : ''}`)} I will say when we cross from one to another.`
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
	private previous?: string;
	/** Stops where the reader has found what was hidden. */
	private readonly explored = new Set<string>();
	/** True between the introduction and the tour. */
	private choosing = false;
	/** Chance, for what comes back: Math.random unless a test fixes it. */
	chance: () => number = Math.random;
	/** Broken names Guide has spoken on this walk, with the move they were collected on. */
	private readonly carried = new Map<string, { at: string; move: number }>();
	private readonly recalled = new Set<string>();
	private moves = 0;
	/** What the reader heard at the last two places, by key: not said again so soon. */
	private heard: string[][] = [];
	/** The one street the reader was part way along at the last place, if any. */
	private lastStreet?: string;
	/** Which form of the opening was said last, so the next place opens another way. */
	private whereForm = -1;
	/** The last way each framing line was put, so the next place puts it another way. */
	private readonly framed = new Map<string, string>();
	/** Distinctive words met on this walk, with where and in what name. */
	private readonly met = new Map<
		string,
		{ said: string; at: string; move: number; street?: boolean }[]
	>();
	private readonly connected = new Set<string>();
	/** Today's weather and the sky, as the browser found them when the walk began. */
	private now: Fact[] = [];
	/** Places already told in full; told briefly on return unless verbose. */
	private readonly visited = new Set<string>();
	private verbose = false;
	private walked = 0;
	private lastCommand?: string;
	/** The names the reader carries, in the order taken. */
	private readonly pocket: string[] = [];
	/** Names the reader has left, by the stop they were left at. */
	private readonly left = new Map<string, string[]>();
	/** Where walks are kept, if anywhere; the walk keeps itself in its own slot after each command. */
	saves?: SaveStore;
	clock: () => Date = () => new Date();

	constructor(
		private readonly world: AdventureWorld,
		public here = world.start
	) {}

	/** The start of the walk: Guide introduces themselves and offers the tour. */
	begin(now: Fact[] = []): Reply[] {
		this.choosing = true;
		this.now = now;
		const { asOf, about } = this.world;
		const today = [weatherNow(now), airNow(now), skyLine(now)].filter(Boolean).join(' ');
		if (about && asOf)
			return [
				{ lines: [...INTRO, ...ledgerLines(asOf, about), ...(today ? [today] : [])] },
				{ lines: [OFFER], actions: [...this.continuing(), ...TAKE_TOUR] }
			];
		const sky = today ? ` ${today}` : '';
		const map = asOf
			? `The map I carry is dated ${longDate(asOf)}.${sky} Beyond it there may be more. I could not say what.`
			: 'Beyond my map there may be more. I could not say what.';
		return [
			{ lines: [...INTRO, map] },
			{ lines: [OFFER], actions: [...this.continuing(), ...TAKE_TOUR] }
		];
	}

	private beginAt(id: string): Reply {
		this.choosing = false;
		this.here = id;
		this.previous = undefined;
		return this.arrive();
	}

	/** A button to pick up the walk kept from before, on this map, if there is one. */
	private continuing(): { label: string; command: string }[] {
		const kept = this.saves?.get(AUTO);
		if (!kept || kept.map !== this.mapId()) return [];
		return [
			{
				label: `Continue the walk (${kept.place}, ${distanceWords(kept.walked)})`,
				command: `restore ${AUTO}`
			}
		];
	}

	private choose(input: string): Reply {
		const command = parse(input);
		if (command.verb === 'restore') return this.restore(command.slot);
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
		const stop = this.world.stops[this.here];
		return { title: stop.title, lines: this.inFull(stop) };
	}

	/** The place again from the template alone, where prose was told instead. */
	private plainly(): Reply {
		const stop = this.world.stops[this.here];
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
		return lightingNow(p.lit, p.pavement, sun, this.moves);
	}

	/** Where the walk stands, for a status line. */
	status(): Status {
		return { place: this.world.stops[this.here].title, moves: this.moves, walked: this.walked };
	}

	respond(input: string): Reply {
		const reply = this.answer(input);
		if (!this.choosing && this.saves) this.keep(AUTO);
		return reply;
	}

	private answer(input: string): Reply {
		if (this.choosing) return this.choose(input);
		const command = parse(input);
		if (command.verb === 'again')
			return this.lastCommand === undefined
				? { lines: ['You have done nothing yet to do again.'] }
				: this.answer(this.lastCommand);
		if (command.verb !== 'empty') this.lastCommand = input;
		switch (command.verb) {
			case 'empty':
				return { lines: [] };
			case 'look':
				return this.look();
			case 'plainly':
				return this.plainly();
			case 'explore':
				return this.explore();
			case 'help':
				return { lines: [HELP] };
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
			case 'overhead':
				return this.lookUp();
			case 'camera':
				return { lines: [], ask: 'camera' };
			case 'beyond':
				return { lines: [this.beyond()] };
			case 'exits':
				return { lines: [this.exits()] };
			case 'back':
				return this.previous
					? this.moveTo(this.previous)
					: { lines: ['You haven’t come from anywhere yet.'] };
			case 'go':
				return this.go(command.direction);
			case 'examine':
				return this.examine(command.target);
			case 'wait':
				return { lines: ['Time passes. Not much else does.'] };
			case 'verbose':
				this.verbose = true;
				return { lines: ['I will tell every place in full, however often you come back to it.'] };
			case 'brief':
				this.verbose = false;
				return { lines: ['Brief, then: a place in full the first time, and briefly after.'] };
			case 'score':
				return { lines: [this.score()] };
			case 'magic':
				return { lines: ['Nothing happens. Nothing has happened here for some time.'] };
			case 'inventory':
				return { lines: [this.inventory()] };
			case 'save':
				return this.save(command.slot);
			case 'restore':
				return this.restore(command.slot);
			case 'take':
				return { lines: [this.take(command.target)] };
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
		const stop = this.world.stops[this.here];
		return (
			stop.paragraphs.find((p) => p.startsWith('Exits:')) ??
			`Exits: ${stop.exits.map((e) => e.label).join(', ')}.`
		);
	}

	private go(where: string): Reply {
		const exits = this.world.stops[this.here].exits;
		const matches = matchExits(exits, where);
		if (matches.length === 1) return this.moveTo(matches[0].to);
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

	private moveTo(to: string): Reply {
		const from = this.world.stops[this.here].at;
		const at = this.world.stops[to].at;
		const before = this.walked;
		if (from && at) this.walked += distance(from, at);
		this.previous = this.here;
		this.here = to;
		this.moves++;
		const reply = this.arrive();
		const passed = MARKS.filter((m) => m > before && m <= this.walked).at(-1);
		return passed
			? { ...reply, lines: [...reply.lines, `You have walked ${distanceWords(passed)}.`] }
			: reply;
	}

	/** Which map this is, so a walk saved on another is never picked up here. */
	private mapId(): string {
		return `${this.world.asOf ?? ''}|${this.world.start}|${Object.keys(this.world.stops).length}`;
	}

	/** The walk as plain data, to keep. */
	snapshot(): SavedWalk {
		const state: WalkState = {
			here: this.here,
			...(this.previous ? { previous: this.previous } : {}),
			moves: this.moves,
			walked: this.walked,
			verbose: this.verbose,
			...(this.lastCommand ? { lastCommand: this.lastCommand } : {}),
			...(this.lastStreet ? { lastStreet: this.lastStreet } : {}),
			visited: [...this.visited],
			explored: [...this.explored],
			pocket: [...this.pocket],
			left: [...this.left],
			carried: [...this.carried],
			recalled: [...this.recalled],
			heard: this.heard,
			framed: [...this.framed],
			met: [...this.met],
			connected: [...this.connected]
		};
		return {
			version: 1,
			map: this.mapId(),
			savedAt: this.clock().toISOString(),
			place: this.world.stops[this.here].title,
			walked: this.walked,
			moves: this.moves,
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
				.filter(
					(k): k is { s: string; walk: SavedWalk } => !!k.walk && k.walk.map === this.mapId()
				);
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
		if (walk.version !== 1 || walk.map !== this.mapId() || !this.world.stops[walk.state.here])
			return { lines: ['That walk was on another map. I cannot pick it up on this one.'] };
		this.load(walk.state);
		const place = this.look();
		const said = slot === AUTO ? 'We go on from where we were.' : `Restored from slot ${slot}.`;
		return { ...place, lines: [said, ...place.lines] };
	}

	private load(state: WalkState): void {
		this.choosing = false;
		this.here = state.here;
		this.previous = state.previous;
		this.moves = state.moves;
		this.walked = state.walked;
		this.verbose = state.verbose;
		this.lastCommand = state.lastCommand;
		this.lastStreet = state.lastStreet;
		this.heard = state.heard;
		refill(this.visited, state.visited);
		refill(this.explored, state.explored);
		refill(this.recalled, state.recalled);
		refill(this.connected, state.connected);
		this.pocket.splice(0, this.pocket.length, ...state.pocket);
		refillMap(this.left, state.left);
		refillMap(this.carried, state.carried);
		refillMap(this.framed, state.framed);
		refillMap(this.met, state.met);
	}

	private score(): string {
		const moves = `${this.moves} move${this.moves === 1 ? '' : 's'}`;
		const next = MARKS.find((m) => m > this.walked);
		const mark = next
			? ` The next mark is ${distanceWords(next)}.`
			: ' You have passed every mark I know.';
		return `You have walked ${distanceWords(this.walked)} in ${moves}.${mark}`;
	}

	private inventory(): string {
		return this.pocket.length
			? `You are carrying ${listed(this.pocket.map(quote))}.`
			: 'You are carrying nothing. Names, perhaps, if you take them.';
	}

	/** Takes a name: of something left here, a broken name spoken here, or a thing here. Never the thing. */
	private take(target: string): string {
		const stop = this.world.stops[this.here];
		const words = target.toLowerCase().split(/\s+/);
		const means = (name: string) => words.every((w) => name.toLowerCase().includes(w));
		const left = this.left.get(this.here) ?? [];
		const name =
			left.find(means) ??
			(stop.fragments ?? []).find(means) ??
			this.visibleThings().find((t) => words.every((w) => t.aliases.includes(w)))?.name;
		if (!name) return `You see no ${target} here.`;
		if (this.pocket.includes(name)) return `You already carry ${quote(name)}.`;
		this.pocket.push(name);
		if (!this.carried.has(name)) this.carried.set(name, { at: this.here, move: this.moves });
		if (left.includes(name)) {
			this.left.set(
				this.here,
				left.filter((n) => n !== name)
			);
			return `Taken: ${quote(name)}.`;
		}
		return (stop.fragments ?? []).includes(name)
			? `Taken: ${quote(name)}.`
			: `You cannot take ${name}. I take its name, ${quote(name)}, for you.`;
	}

	private drop(target: string): string {
		const words = target.toLowerCase().split(/\s+/);
		const name = this.pocket.find((n) => words.every((w) => n.toLowerCase().includes(w)));
		if (!name) return 'You are not carrying that.';
		this.pocket.splice(this.pocket.indexOf(name), 1);
		this.left.set(this.here, [...(this.left.get(this.here) ?? []), name]);
		return `You leave ${quote(name)} here.`;
	}

	/** The things here a reader can see: told, or found by exploring; not the land they stand on. */
	private visibleThings(): Thing[] {
		const stop = this.world.stops[this.here];
		const found = this.explored.has(this.here) ? (stop.hidden?.things ?? []) : [];
		return [...stop.things, ...found].filter(
			(t, i, all) => !t.background && all.findIndex((o) => o.name === t.name) === i
		);
	}

	/** A place returned to: its name, what can be seen, and the ways on. */
	private brief(): Reply {
		const stop = this.world.stops[this.here];
		const names = this.visibleThings().map((t) => withArticle(t.name));
		this.heard = [...this.heard, []].slice(-2);
		this.lastStreet = undefined;
		return {
			title: stop.title,
			lines: [...(names.length ? [`You can see ${listed(names)} here.`] : []), this.exits()]
		};
	}

	/** A place reached: told, its broken names carried on, and now and then one carried before comes back. */
	private arrive(): Reply {
		const told = this.visited.has(this.here) && !this.verbose ? this.brief() : this.told();
		this.visited.add(this.here);
		const left = (this.left.get(this.here) ?? []).map(
			(n) => `${quote(n)} lies here, where you left it.`
		);
		const crossed = [this.crossing(), ...this.zoning()].filter((l): l is string => !!l);
		const reply = crossed.length ? { ...told, lines: [...crossed, ...told.lines] } : told;
		const stop = this.world.stops[this.here];
		const back = this.recall(stop.fragments ?? []) ?? this.connect(stop.terms ?? []);
		for (const f of stop.fragments ?? [])
			if (!this.carried.has(f)) this.carried.set(f, { at: this.here, move: this.moves });
		for (const t of stop.terms ?? [])
			this.met.set(t.term, [
				...(this.met.get(t.term) ?? []),
				{ said: t.said, at: this.here, move: this.moves, street: t.street }
			]);
		const lines = [...reply.lines];
		const exits =
			lines.length && lines.at(-1)!.startsWith('Exits:') ? lines.length - 1 : lines.length;
		lines.splice(exits, 0, ...left, ...(back ? [back] : []));
		return { ...reply, lines };
	}

	/** Where the map puts this stop, and a link to it on Google Maps: never where the reader is. */
	private gps(): Reply {
		const stop = this.world.stops[this.here];
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
		const before = this.previous === undefined ? [] : (this.world.stops[this.previous].zones ?? []);
		const now = this.world.stops[this.here].zones ?? [];
		const names = (zones: { name: string }[]) => new Set(zones.map((z) => z.name));
		const was = names(before);
		const is = names(now);
		return [
			...now
				.filter((z) => !was.has(z.name))
				.map((z) => hearsay(`you are within ${z.name}, ${withArticle(z.kind)}`)),
			...before.filter((z) => !is.has(z.name)).map((z) => hearsay(`you have come out of ${z.name}`))
		];
	}

	/** A step into, out of or between the areas another account draws, such as wards. */
	private crossing(): string | undefined {
		const from = this.previous === undefined ? undefined : this.world.stops[this.previous].area;
		const to = this.world.stops[this.here].area;
		if (from?.name === to?.name) return undefined;
		if (!from) return hearsay(`you are in ${to!.name}, a ${to!.kind}`);
		return to
			? hearsay(`you have left ${from.name} for ${to.name}`)
			: hearsay(`you have left ${from.name}`);
	}

	/** Where the map puts this place, for what is asked of it: never where the reader is. */
	position(): { latitude: number; longitude: number } | undefined {
		const at = this.world.stops[this.here].at;
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
		const at = this.world.stops[this.here].at;
		return (
			(at && beyondLine(this.world.beyond ?? [], at)) ??
			'Beyond the map there may be more. I could not say what.'
		);
	}

	/** What the nearest camera saw, as the page found it; nothing happens without an answer. */
	camera(facts: readonly Fact[] | undefined): Reply {
		const at = this.world.stops[this.here].at;
		if (!facts || !at) return { lines: ['Nothing happens.'] };
		return cameraLines(facts, at);
	}

	/** The bus and tram stops here that TfL has live arrivals for. */
	transitHere(): TransitStop[] {
		return this.world.stops[this.here].transit ?? [];
	}

	/** What is due at a stop, as TfL answered; nothing at all without an answer. */
	departures(stop: TransitStop, facts: Fact[] | undefined): Reply | undefined {
		if (!facts) return undefined;
		const line = departuresLine(facts, stop.name);
		return line ? { lines: [line] } : undefined;
	}

	/** A place as the reader arrives: what they heard at the last two places is not said again. */
	private told(): Reply {
		const stop = this.world.stops[this.here];
		if (!stop.parts) return this.look();
		const recent = new Set(this.heard.flat());
		const heard: string[] = [];
		let street: string | undefined;
		const lines = stop.parts
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
							if (p.street && p.street === this.lastStreet) return this.goOn(p.text);
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
		this.heard = [...this.heard, heard].slice(-2);
		this.lastStreet = street;
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
		const last = this.framed.get(key);
		const next = options[(options.indexOf(last ?? '') + 1) % options.length];
		this.framed.set(key, next);
		return next;
	}

	/** Two names that share a word, met in different places, set side by side if chance allows. */
	private connect(here: readonly Term[]): string | undefined {
		if (this.connected.size >= CONNECTIONS) return undefined;
		for (const t of here) {
			if (this.connected.has(t.term)) continue;
			const earlier = (this.met.get(t.term) ?? []).find(
				(e) =>
					!e.said.toLowerCase().includes(t.said.toLowerCase()) &&
					!t.said.toLowerCase().includes(e.said.toLowerCase()) &&
					e.at !== this.here &&
					this.moves - e.move >= CONNECT_AFTER &&
					!(e.street && t.street)
			);
			if (!earlier) continue;
			if (this.chance() >= CONNECT_CHANCE) return undefined;
			this.connected.add(t.term);
			return `“${t.said}”. Earlier, “${earlier.said}”.`;
		}
		return undefined;
	}

	/** A fragment carried long enough to come back here, out of place, if chance allows. */
	private recall(here: readonly string[]): string | undefined {
		if (this.recalled.size >= RECALLS || here.length) return undefined;
		const ready = [...this.carried].filter(
			([f, c]) => !this.recalled.has(f) && c.at !== this.here && this.moves - c.move >= RECALL_AFTER
		);
		if (!ready.length || this.chance() >= RECALL_CHANCE) return undefined;
		const [fragment] = ready[Math.floor(this.chance() * ready.length)];
		this.recalled.add(fragment);
		return RECALLED[Math.floor(this.chance() * RECALLED.length)](fragment);
	}

	private explore(): Reply {
		const hidden = this.world.stops[this.here].hidden;
		if (!hidden || this.explored.has(this.here))
			return { lines: ['You look around, and find nothing more than I have told you.'] };
		this.explored.add(this.here);
		return { lines: hidden.lines };
	}

	private examine(target: string): Reply {
		const stop = this.world.stops[this.here];
		if (EVERYTHING.has(target)) return { lines: [this.whatToExamine()] };
		const words = target.split(/\s+/);
		const named = (among: Thing[]) =>
			among.filter((t) => words.every((w) => t.aliases.includes(w)));
		let things = named(stop.things);
		// Something unnoticed can still be found by naming it.
		if (things.length === 0 && stop.hidden) things = named(stop.hidden.things);
		if (things.length === 0) things = named(stop.streets ?? []);
		if (things.length === 0) return { lines: [`You see no ${target} here.`] };
		if (things.length > 1 && !things.every((t) => t.name === things[0].name))
			return { lines: [`Which do you mean: ${things.map((t) => t.name).join(' or ')}?`] };
		return { lines: things.map((t) => t.description) };
	}

	/** What there is to examine here, by name: the street, and each thing told or found. */
	private whatToExamine(): string {
		const stop = this.world.stops[this.here];
		const found = this.explored.has(this.here) ? (stop.hidden?.things ?? []) : [];
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

/** A set holding just these items. */
function refill<T>(set: Set<T>, items: readonly T[]): void {
	set.clear();
	for (const item of items) set.add(item);
}

/** A map holding just these entries. */
function refillMap<K, V>(map: Map<K, V>, entries: readonly [K, V][]): void {
	map.clear();
	for (const [k, v] of entries) map.set(k, v);
}
