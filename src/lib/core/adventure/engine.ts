import type { Fact } from '../facts';
import { skyLine } from '../render/sky';
import { weatherNow } from '../render/weather';
import { departuresLine } from '../render/departures';
import { longDate } from '../render/words';
import { direction, parse } from './parser';
import type { Thing } from '../render/renderer';
import type { AdventureWorld, CompiledExit, Term, TransitStop } from './world';

export interface Reply {
	/** Set when the reply describes a place. */
	title?: string;
	lines: string[];
}

export const HELP =
	'Type a direction to walk: north, ne, go east, or the name of a street. ' +
	'Type look to hear the place again, explore to find what I have not mentioned, examine to see what there is, or examine a thing or a street to look closer, ' +
	'exits for the ways on, back to retrace your step, and weather to ask after the sky.';

/** Guide's words about themselves, said once, before the first place. */
export const INTRO = ['I am Guide. I lived here a long time ago, yesterday, and tomorrow.'];

const OFFER = 'Shall I show you round? Type take the tour, and we will begin.';
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

	constructor(
		private readonly world: AdventureWorld,
		public here = world.start
	) {}

	/** The start of the walk: Guide introduces themselves and offers the tour. */
	begin(now: Fact[] = []): Reply[] {
		this.choosing = true;
		this.now = now;
		const { asOf } = this.world;
		const today = [weatherNow(now), skyLine(now)].filter(Boolean).join(' ');
		const sky = today ? ` ${today}` : '';
		const map = asOf
			? `The map I carry is dated ${longDate(asOf)}.${sky} Beyond it there may be more. I could not say what.`
			: 'Beyond my map there may be more. I could not say what.';
		return [{ lines: [...INTRO, map] }, { lines: [OFFER] }];
	}

	private beginAt(id: string): Reply {
		this.choosing = false;
		this.here = id;
		this.previous = undefined;
		return this.arrive();
	}

	private choose(input: string): Reply {
		const words = input
			.trim()
			.toLowerCase()
			.replace(/[.!?]+$/, '');
		if (!words) return { lines: [] };
		return TOUR.test(words) ? this.beginAt(this.world.start) : { lines: [OFFER] };
	}

	look(): Reply {
		const stop = this.world.stops[this.here];
		return { title: stop.title, lines: stop.paragraphs };
	}

	respond(input: string): Reply {
		if (this.choosing) return this.choose(input);
		const command = parse(input);
		switch (command.verb) {
			case 'empty':
				return { lines: [] };
			case 'look':
				return this.look();
			case 'explore':
				return this.explore();
			case 'help':
				return { lines: [HELP] };
			case 'weather':
				return {
					lines: [
						[weatherNow(this.now) ?? 'I have no word of the weather today.', skyLine(this.now)]
							.filter(Boolean)
							.join(' ')
					]
				};
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
			case 'unknown':
				return {
					lines: [`I don’t know how to “${command.text}”. Type help to see what I understand.`]
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
		this.previous = this.here;
		this.here = to;
		this.moves++;
		return this.arrive();
	}

	/** A place reached: told, its broken names carried on, and now and then one carried before comes back. */
	private arrive(): Reply {
		const reply = this.told();
		const stop = this.world.stops[this.here];
		const back = this.recall(stop.fragments ?? []) ?? this.connect(stop.terms ?? []);
		for (const f of stop.fragments ?? [])
			if (!this.carried.has(f)) this.carried.set(f, { at: this.here, move: this.moves });
		for (const t of stop.terms ?? [])
			this.met.set(t.term, [
				...(this.met.get(t.term) ?? []),
				{ said: t.said, at: this.here, move: this.moves, street: t.street }
			]);
		if (!back) return reply;
		const lines = [...reply.lines];
		const exits =
			lines.length && lines.at(-1)!.startsWith('Exits:') ? lines.length - 1 : lines.length;
		lines.splice(exits, 0, back);
		return { ...reply, lines };
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
				const fresh = parts.filter(
					(p) => !['street', 'setting', 'thing'].includes(p.kind) || !recent.has(p.key)
				);
				const framesNothing =
					parts.some((p) => p.kind === 'thing') && !fresh.some((p) => p.kind === 'thing');
				return fresh
					.filter((p) => !(framesNothing && p.kind === 'frame'))
					.map((p) => {
						if (['street', 'setting', 'thing'].includes(p.kind)) heard.push(p.key);
						if (p.kind === 'where') {
							street = p.street;
							if (p.street && p.street === this.lastStreet) return this.goOn(p.text);
						}
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
		const names = things.map((t) =>
			/^[\p{Lu}\p{N}“]/u.test(t.name)
				? t.name
				: `${/^[aeiou]/i.test(t.name) ? 'an' : 'a'} ${t.name}`
		);
		const streets = (stop.streets ?? []).map((s) => s.name);
		if (!names.length)
			return streets.length
				? `There is nothing here to examine but ${streets.join(' and ')}.`
				: 'There is nothing here to examine.';
		const all = [...streets, ...names];
		return `You could examine ${all.length < 2 ? all[0] : `${all.slice(0, -1).join(', ')}, or ${all.at(-1)}`}.`;
	}
}

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
