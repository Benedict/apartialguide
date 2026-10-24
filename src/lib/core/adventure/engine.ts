import { direction, parse } from './parser';
import type { AdventureWorld, CompiledExit } from './world';

export interface Reply {
	/** Set when the reply describes a place. */
	title?: string;
	lines: string[];
}

export const HELP =
	'Type a direction to walk: north, ne, go east, or the name of a street. ' +
	'Type look to look around again, examine and a thing to look closer, exits for the ways on, and back to retrace your step.';

/** A reader's walk through a compiled world. */
export class Adventure {
	private previous?: string;

	constructor(
		private readonly world: AdventureWorld,
		public here = world.start
	) {}

	look(): Reply {
		const stop = this.world.stops[this.here];
		return { title: stop.title, lines: stop.paragraphs };
	}

	respond(input: string): Reply {
		const command = parse(input);
		switch (command.verb) {
			case 'empty':
				return { lines: [] };
			case 'look':
				return this.look();
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

	private examine(target: string): Reply {
		const words = target.split(/\s+/);
		const things = this.world.stops[this.here].things.filter((t) =>
			words.every((w) => t.aliases.includes(w))
		);
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
