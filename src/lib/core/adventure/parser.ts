export type Command =
	| { verb: 'go'; direction: string }
	| { verb: 'examine'; target: string }
	| { verb: 'look' | 'explore' | 'exits' | 'back' | 'help' | 'empty' }
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
	if (first === 'look' && rest[0] === 'at' && rest.length > 1)
		return { verb: 'examine', target: dropFiller(rest).join(' ') };
	if (EXAMINE.has(first) && rest.length)
		return { verb: 'examine', target: dropFiller(rest).join(' ') };
	if (text === 'l' || text === 'look') return { verb: 'look' };
	if (['explore', 'search', 'look around', 'look closer', 'look about'].includes(text))
		return { verb: 'explore' };
	if (text === 'exits' || text === 'ways') return { verb: 'exits' };
	if (text === 'help' || text === '?' || text === 'h') return { verb: 'help' };
	return { verb: 'unknown', text };
}
