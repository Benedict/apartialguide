import type { OsmElement, OsmMember } from '../core/osm';

/**
 * Reads OSM's plain text format, OPL, one element a line (`osmium cat -f opl`), into the snapshot's
 * own elements: nodes, ways and areas drawn as multipolygons, with their tags, version and time. A downloaded extract carries no
 * one's name, and the snapshot needs none.
 */

/** OPL writes a space, comma, equals sign, percent sign and the like as `%` + hex code + `%`. */
const unescape = (text: string) =>
	text.replace(/%([0-9a-fA-F]+)%/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));

function tagsOf(field: string): Record<string, string> | undefined {
	if (!field) return undefined;
	const tags: Record<string, string> = {};
	for (const pair of field.split(',')) {
		const at = pair.indexOf('=');
		tags[unescape(pair.slice(0, at))] = unescape(pair.slice(at + 1));
	}
	return tags;
}

const MEMBER_TYPES = { n: 'node', w: 'way', r: 'relation' } as const;

/** A relation's members as OPL writes them: `w7@outer,w11@inner`. */
function membersOf(field: string): OsmMember[] {
	return field
		.split(',')
		.filter(Boolean)
		.map((m) => {
			const at = m.indexOf('@');
			return {
				type: MEMBER_TYPES[m[0] as keyof typeof MEMBER_TYPES],
				ref: Number(m.slice(1, at)),
				role: unescape(m.slice(at + 1))
			};
		});
}

/**
 * One OPL line as a snapshot element: a node, a way, or an area drawn as a multipolygon relation;
 * nothing for any other relation, a deleted thing or a blank.
 */
export function oplElement(line: string): OsmElement | undefined {
	const [head, ...rest] = line.trim().split(' ');
	if (!head || !'nwr'.includes(head[0])) return undefined;
	const field = (key: string) => rest.find((f) => f[0] === key)?.slice(1) ?? '';
	if (field('d') === 'D') return undefined;
	const tags = tagsOf(field('T'));
	const base = {
		id: Number(head.slice(1)),
		...(field('v') ? { version: Number(field('v')) } : {}),
		...(field('t') ? { timestamp: field('t') } : {}),
		...(tags ? { tags } : {})
	};
	if (head[0] === 'r')
		return tags?.type === 'multipolygon'
			? { type: 'relation', ...base, members: membersOf(field('M')) }
			: undefined;
	if (head[0] === 'w')
		return {
			type: 'way',
			...base,
			nodes: field('N')
				.split(',')
				.filter(Boolean)
				.map((n) => Number(n.slice(1)))
		};
	return { type: 'node', ...base, lon: Number(field('x')), lat: Number(field('y')) };
}
