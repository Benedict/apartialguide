import { distance } from '../geo';
import { longDate } from '../render/words';
import { direction, parse } from './parser';
import { findPlace } from './places';
import type { Thing } from '../render/renderer';
import type { AdventureWorld, CompiledExit } from './world';

export interface Reply {
	/** Set when the reply describes a place. */
	title?: string;
	lines: string[];
	/** Set when the game needs to know where the reader is, from the browser. */
	locate?: true;
}

export const HELP =
	'Type a direction to walk: north, ne, go east, or the name of a street. ' +
	'Type look to hear the place again, explore to find what I have not mentioned, examine and a thing to look closer, ' +
	'exits for the ways on, and back to retrace your step.';

/** Guide's words about themselves, said once, before the first place. */
export const INTRO = [
	'I am Guide. I lived here a long time ago, yesterday, and tomorrow.',
	'I know these streets as they were written down, which is not the same as knowing them. ' +
		'What I tell you was recorded by other people, on other days. Where they stopped, I stop. ' +
		'I try not to fill the gaps. I do not always see them.'
];

const ASK =
	'Where would you like to begin? Give me a postcode, a street or a place. ' +
	'Or say here, and I will look for you, or anywhere, and I will choose.';
const ASK_AGAIN = 'Give me a postcode, a street or a place, or say anywhere.';
const HERE = /^(here|where i am|current location|my location|near me|locate me)$/;
const ANYWHERE = /^(anywhere|you choose|surprise me|start|begin|anything)$/;
/** How far from the nearest stop the reader may be and still be on the map, in metres. */
const NEAR = 300;

/** A reader's walk through a compiled world. */
export class Adventure {
	private previous?: string;
	/** Stops where the reader has found what was hidden. */
	private readonly explored = new Set<string>();
	/** True between the introduction and the first place. */
	private choosing = false;

	constructor(
		private readonly world: AdventureWorld,
		public here = world.start
	) {}

	/** The start of the walk: Guide introduces themselves and asks where to begin. */
	begin(): Reply[] {
		this.choosing = true;
		const { asOf } = this.world;
		const map = asOf
			? `The map I carry is dated ${longDate(asOf)}. Beyond it there may be more. I could not say what.`
			: 'Beyond my map there may be more. I could not say what.';
		return [{ lines: [...INTRO, map] }, { lines: [ASK] }];
	}

	/** Begins at the stop nearest where the browser found the reader. */
	startAt(lat: number, lon: number): Reply {
		let best: { id: string; metres: number } | undefined;
		for (const [id, at] of Object.entries(this.world.positions ?? {})) {
			const metres = distance([lat, lon], at);
			if (!best || metres < best.metres) best = { id, metres };
		}
		if (!best || best.metres > NEAR) return { lines: [`That is not on my map. ${ASK_AGAIN}`] };
		return this.beginAt(best.id);
	}

	/** When the browser could not find the reader. */
	notFound(): Reply {
		return { lines: [`I cannot find you. ${ASK_AGAIN}`] };
	}

	private beginAt(id: string): Reply {
		this.choosing = false;
		this.here = id;
		this.previous = undefined;
		return this.look();
	}

	private choose(input: string): Reply {
		const words = input
			.trim()
			.toLowerCase()
			.replace(/[.!?]+$/, '');
		if (!words) return { lines: [] };
		if (words === 'help') return { lines: [ASK] };
		if (HERE.test(words)) return { lines: ['Hold still. I am looking for you.'], locate: true };
		if (ANYWHERE.test(words)) return this.beginAt(this.world.start);
		const found = findPlace(this.world.places ?? [], input);
		if (found.kind === 'found' && found.near) {
			const asked = input
				.trim()
				.toUpperCase()
				.replace(/\s+/g, '')
				.replace(/(\d[A-Z]{2})$/, ' $1');
			const place = this.beginAt(found.at);
			const note = `I have no record of ${asked}. Only of its neighbours, ${found.near}.`;
			return { ...place, lines: [note, ...place.lines] };
		}
		if (found.kind === 'found') return this.beginAt(found.at);
		if (found.kind === 'choose') return { lines: [`Which: ${either(found.names)}?`] };
		return { lines: [`I have no record of “${input.trim()}”. ${ASK_AGAIN}`] };
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
		return this.look();
	}

	private explore(): Reply {
		const hidden = this.world.stops[this.here].hidden;
		if (!hidden || this.explored.has(this.here))
			return { lines: ['You look around, and find nothing more than I have told you.'] };
		this.explored.add(this.here);
		return { lines: hidden.lines };
	}

	private examine(target: string): Reply {
		const words = target.split(/\s+/);
		const stop = this.world.stops[this.here];
		const named = (among: Thing[]) =>
			among.filter((t) => words.every((w) => t.aliases.includes(w)));
		let things = named(stop.things);
		// Something unnoticed can still be found by naming it.
		if (things.length === 0 && stop.hidden) things = named(stop.hidden.things);
		if (things.length === 0) return { lines: [`You see no ${target} here.`] };
		if (things.length > 1 && !things.every((t) => t.name === things[0].name))
			return { lines: [`Which do you mean: ${things.map((t) => t.name).join(' or ')}?`] };
		return { lines: things.map((t) => t.description) };
	}
}

/** Exits the reader could mean: an exact compass label, a label with a street after it, or a street name. */
function matchExits(exits: readonly CompiledExit[], where: string): CompiledExit[] {
	const exact = exits.filter((e) => e.label === where);
	if (exact.length) return exact;
	const qualified = exits.filter((e) => e.label.startsWith(`${where} (`));
	if (qualified.length) return qualified;
	return exits.filter((e) => e.street?.toLowerCase() === where);
}

/** "A or B", "A, B or C"; past six, the rest go unsaid. */
function either(names: string[]): string {
	const shown = names.slice(0, 6);
	if (names.length > shown.length) return `${shown.join(', ')}, or another`;
	return shown.length < 2 ? shown.join('') : `${shown.slice(0, -1).join(', ')} or ${shown.at(-1)}`;
}
