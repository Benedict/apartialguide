export type Command =
	| { verb: 'go'; direction: string }
	| { verb: 'examine' | 'take' | 'drop'; target: string }
	| { verb: 'save' | 'restore'; slot?: string }
	| {
			verb:
				| 'look'
				| 'explore'
				| 'exits'
				| 'back'
				| 'help'
				| 'weather'
				| 'overhead'
				| 'camera'
				| 'beyond'
				| 'gps'
				| 'wait'
				| 'again'
				| 'inventory'
				| 'verbose'
				| 'brief'
				| 'score'
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

export function parse(input: string): Command {
	const text = input
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s'’?-]/gu, '')
		.trim();
	if (!text) return { verb: 'empty' };
	const words = text.split(/\s+/);
	const [first, ...rest] = words;

	if (['back', 'b', 'return', 'go back'].includes(text)) return { verb: 'back' };
	if (direction(text)) return { verb: 'go', direction: direction(text)! };
	if (MOVE.has(first) && rest.length) {
		const target = dropFiller(rest).join(' ');
		return { verb: 'go', direction: direction(target) ?? target };
	}
	if (['gps', 'where am i', 'where am i?', 'map'].includes(text)) return { verb: 'gps' };
	if (['weather', 'the weather', 'sky'].includes(text)) return { verb: 'weather' };
	if (
		['look beyond', 'beyond', 'look further', 'what lies beyond', 'look past the map'].includes(
			text
		)
	)
		return { verb: 'beyond' };
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
	if (first === 'save') return rest.length ? { verb: 'save', slot: rest[0] } : { verb: 'save' };
	if (text === 'continue') return { verb: 'restore', slot: 'auto' };
	if (['restore', 'load', 'saves'].includes(first))
		return rest.length && first !== 'saves'
			? { verb: 'restore', slot: rest[0] }
			: { verb: 'restore' };
	const said = SAYINGS.get(text);
	if (said) return { verb: said };
	if (TAKE.has(first) && rest.length) return { verb: 'take', target: dropFiller(rest).join(' ') };
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
