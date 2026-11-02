export type Command =
	| { verb: 'go'; direction: string }
	| { verb: 'examine' | 'take' | 'drop' | 'remember'; target: string }
	| { verb: 'save' | 'restore'; slot?: string }
	| { verb: 'follow'; on: boolean }
	| { verb: 'hints'; on: boolean }
	| { verb: 'colour'; colour?: string }
	| { verb: 'route'; target?: string }
	| { verb: 'start'; where: string; at?: boolean }
	| { verb: 'glass'; on: boolean }
	| { verb: 'draw'; all: boolean }
	| {
			verb:
				| 'look'
				| 'plainly'
				| 'explore'
				| 'exits'
				| 'back'
				| 'help'
				| 'weather'
				| 'overhead'
				| 'camera'
				| 'news'
				| 'feedback'
				| 'beyond'
				| 'areas'
				| 'gps'
				| 'wait'
				| 'again'
				| 'inventory'
				| 'verbose'
				| 'brief'
				| 'score'
				| 'drift'
				| 'hint'
				| 'magic'
				| 'empty';
	  }
	| { verb: 'unknown'; text: string };

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

/** Every way of writing a compass point, with spaces and hyphens removed, mapped to its label. */
const DIRECTIONS = new Map<string, string>(
	POINTS.flatMap((p) => {
		const abbreviation = p
			.split('-')
			.map((w) => w[0])
			.join('');
		return [
			[p.replace(/-/g, ''), p],
			[abbreviation, p]
		];
	})
);

/** One-word commands, as classic adventures took them. */
const SAYINGS = new Map<
	string,
	'wait' | 'again' | 'inventory' | 'verbose' | 'brief' | 'score' | 'magic'
>([
	['z', 'wait'],
	['wait', 'wait'],
	['g', 'again'],
	['again', 'again'],
	['i', 'inventory'],
	['inv', 'inventory'],
	['inventory', 'inventory'],
	['verbose', 'verbose'],
	['brief', 'brief'],
	['score', 'score'],
	['xyzzy', 'magic'],
	['plugh', 'magic']
]);
const TAKE = new Set(['take', 'get', 'carry', 'collect']);
const DROP = new Set(['drop', 'leave', 'discard']);
const MOVE = new Set(['go', 'walk', 'head', 'move', 'run', 'travel']);
const EXAMINE = new Set(['x', 'examine', 'inspect', 'read', 'check']);
const FILLER = new Set([
	'to',
	'towards',
	'toward',
	'along',
	'the',
	'at',
	'a',
	'into',
	'down',
	'up'
]);

export function direction(text: string): string | undefined {
	return DIRECTIONS.get(text.replace(/[\s_-]+/g, ''));
}

const dropFiller = (words: string[]) => {
	let i = 0;
	while (i < words.length - 1 && FILLER.has(words[i])) i++;
	return words.slice(i);
};

/** Ways of asking for a circle to walk. */
const GLASS = new Set([
	'place a glass',
	'put down a glass',
	'glass',
	'walk a circle',
	'draw a circle',
	'circle'
]);

/** Ways of asking to begin somewhere by chance. */
const ANYWHERE = new Set([
	'start anywhere',
	'begin anywhere',
	'anywhere',
	'start somewhere',
	'somewhere',
	'surprise me'
]);

export function parse(input: string): Command {
	// A circle to walk, or letting it go.
	const whole = input
		.trim()
		.toLowerCase()
		.replace(/[.!?]+$/, '');
	if (GLASS.has(whole)) return { verb: 'glass', on: true };
	if (['glass off', 'lift the glass', 'circle off'].includes(whole))
		return { verb: 'glass', on: false };
	// Beginning somewhere: in an area by its name, or at a place by the map's name for it, as a shared
	// link gives it, read before punctuation is dropped.
	if (
		ANYWHERE.has(
			input
				.trim()
				.toLowerCase()
				.replace(/[.!?]+$/, '')
		)
	)
		return { verb: 'start', where: 'anywhere' };
	const at = input.trim().match(/^start at\s+(\S+)$/i);
	if (at) return { verb: 'start', where: at[1], at: true };
	const begin = input
		.trim()
		.toLowerCase()
		.match(/^start (in|at)\s+(.+?)[.!?]*$/);
	if (begin) return { verb: 'start', where: begin[2], ...(begin[1] === 'at' ? { at: true } : {}) };
	const text = input
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s'’?-]/gu, '')
		.trim();
	if (!text) return { verb: 'empty' };
	const words = text.split(/\s+/);
	const [first, ...rest] = words;

	if (['back', 'b', 'return', 'go back'].includes(text)) return { verb: 'back' };
	// Asking the way somewhere, or letting it go.
	if (['route off', 'no route', 'forget the way'].includes(text)) return { verb: 'route' };
	const way = text.match(/^(?:route to|(?:the )?way to|directions to|how do i get to)\s+(.+?)\??$/);
	if (way) return { verb: 'route', target: way[1] };
	if (direction(text)) return { verb: 'go', direction: direction(text)! };
	if (['drift', 'wander', 'go anywhere', 'dérive', 'derive'].includes(text))
		return { verb: 'drift' };
	if (MOVE.has(first) && rest.length) {
		const target = dropFiller(rest).join(' ');
		return { verb: 'go', direction: direction(target) ?? target };
	}
	if (['gps', 'where am i', 'where am i?', 'map'].includes(text)) return { verb: 'gps' };
	if (text === 'hint' || text === 'a hint') return { verb: 'hint' };
	const colour = text.match(/^(?:colou?rs?|theme)(?:\s+(.+))?$/);
	if (colour) return { verb: 'colour', ...(colour[1] ? { colour: colour[1] } : {}) };
	if (text === 'hints on' || text === 'hints off')
		return { verb: 'hints', on: text === 'hints on' };
	if (['gps on', 'map on'].includes(text)) return { verb: 'follow', on: true };
	if (['gps off', 'map off'].includes(text)) return { verb: 'follow', on: false };
	if (['weather', 'the weather', 'sky'].includes(text)) return { verb: 'weather' };
	if (
		[
			'look beyond',
			'beyond',
			'look further',
			'what lies beyond',
			'look past',
			'past',
			'look past the map'
		].includes(text)
	)
		return { verb: 'beyond' };
	if (
		[
			'areas',
			'choose an area',
			'choose area',
			'list areas',
			'where can i start',
			'where can we start'
		].includes(text)
	)
		return { verb: 'areas' };
	if (
		[
			'news',
			'the news',
			'read the news',
			'headlines',
			"what's the news",
			'whats the news'
		].includes(text)
	)
		return { verb: 'news' };
	if (['draw', 'draw my walk', 'draw the walk', 'draw my route', 'draw the route'].includes(text))
		return { verb: 'draw', all: false };
	if (['draw my walks', 'draw all my walks', 'draw every walk', 'draw all walks'].includes(text))
		return { verb: 'draw', all: true };
	if (
		['feedback', 'give feedback', 'send feedback', 'leave feedback', 'report a bug'].includes(text)
	)
		return { verb: 'feedback' };
	if (['look up', 'lookup', 'look at the sky', 'look skyward', 'up'].includes(text))
		return { verb: 'overhead' };
	if (
		['use the camera', 'use camera', 'camera', 'the camera', 'look through the camera'].includes(
			text
		)
	)
		return { verb: 'camera' };
	if (first === 'look' && rest[0] === 'at' && rest.length > 1)
		return { verb: 'examine', target: dropFiller(rest).join(' ') };
	if (EXAMINE.has(text)) return { verb: 'examine', target: '' };
	if (EXAMINE.has(first) && rest.length)
		return { verb: 'examine', target: dropFiller(rest).join(' ') };
	if (text === 'l' || text === 'look') return { verb: 'look' };
	if (
		['plainly', 'look plainly', 'again plainly', 'say it plainly', 'tell it plainly'].includes(text)
	)
		return { verb: 'plainly' };
	if (first === 'save') return rest.length ? { verb: 'save', slot: rest[0] } : { verb: 'save' };
	if (text === 'continue') return { verb: 'restore', slot: 'auto' };
	if (['restore', 'load', 'saves'].includes(first))
		return rest.length && first !== 'saves'
			? { verb: 'restore', slot: rest[0] }
			: { verb: 'restore' };
	const said = SAYINGS.get(text);
	if (said) return { verb: said };
	if (TAKE.has(first) && rest.length) return { verb: 'take', target: dropFiller(rest).join(' ') };
	// Asking Guide to keep a name: the only way anything is carried.
	const asked = text.match(/^(?:remember|note|(?:mark|write|note) down)\s+(.+)$/);
	if (asked) return { verb: 'remember', target: dropFiller(asked[1].split(/\s+/)).join(' ') };
	if (first === 'pick' && rest[0] === 'up' && rest.length > 1)
		return { verb: 'take', target: dropFiller(rest.slice(1)).join(' ') };
	if (DROP.has(first) && rest.length) return { verb: 'drop', target: dropFiller(rest).join(' ') };
	if (first === 'put' && rest[0] === 'down' && rest.length > 1)
		return { verb: 'drop', target: dropFiller(rest.slice(1)).join(' ') };
	if (['explore', 'search', 'look around', 'look closer', 'look about'].includes(text))
		return { verb: 'explore' };
	if (text === 'exits' || text === 'ways') return { verb: 'exits' };
	if (text === 'help' || text === '?' || text === 'h') return { verb: 'help' };
	return { verb: 'unknown', text };
}
