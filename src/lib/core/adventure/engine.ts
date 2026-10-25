import type { Fact } from '../facts';
import { weatherNow } from '../render/weather';
import { longDate } from '../render/words';
import { direction, parse } from './parser';
import type { Thing } from '../render/renderer';
import type { AdventureWorld, CompiledExit } from './world';

export interface Reply {
	/** Set when the reply describes a place. */
	title?: string;
	lines: string[];
}

export const HELP =
	'Type a direction to walk: north, ne, go east, or the name of a street. ' +
	'Type look to hear the place again, explore to find what I have not mentioned, examine and a thing to look closer, ' +
	'exits for the ways on, back to retrace your step, and weather to ask after the sky.';

/** Guide's words about themselves, said once, before the first place. */
export const INTRO = ['I am Guide. I lived here a long time ago, yesterday, and tomorrow.'];

const OFFER = 'Shall I show you round? Type take the tour, and we will begin.';
const TOUR = /^(take the tour|take tour|the tour|tour|yes|begin|start)$/;

/** A reader's walk through a compiled world. */
export class Adventure {
	private previous?: string;
	/** Stops where the reader has found what was hidden. */
	private readonly explored = new Set<string>();
	/** True between the introduction and the tour. */
	private choosing = false;
	/** Today's weather, as the browser found it when the walk began. */
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
		const today = weatherNow(now);
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
		return this.look();
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
				return { lines: [weatherNow(this.now) ?? 'I have no word of the weather today.'] };
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
