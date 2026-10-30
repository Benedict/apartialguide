import type { Part, Telling, Thing } from '../render/renderer';
import type { StopId } from '../stops';
import type { AdventureWorld, CompiledStop } from './world';

/** A part as carried: its key left out where it is the text again. */
type PackedPart = Omit<Part, 'key'> & { key?: string };

/** A telling as carried: paragraphs left out where the parts spell them out. */
interface PackedTelling {
	paragraphs?: string[];
	parts?: PackedPart[][];
}

/** A stop as carried: its things by their place in the world's list. */
export type PackedStop = Omit<
	CompiledStop,
	'paragraphs' | 'parts' | 'plain' | 'things' | 'streets' | 'hidden'
> &
	PackedTelling & {
		things: number[];
		streets?: number[];
		hidden?: { lines: string[]; things: number[] };
		plain?: PackedTelling;
	};

/**
 * The world as the page carries it. Neighbouring stops see the same things, and each paragraph is
 * its parts again, so most of a compiled world is repetition; this carries each once.
 */
export interface PackedWorld extends Omit<AdventureWorld, 'stops'> {
	things: Thing[];
	stops: Record<StopId, PackedStop>;
}

const spelled = (parts: Part[][]) => parts.map((row) => row.map((p) => p.text).join(' '));

function packTelling({ paragraphs, parts }: Telling): PackedTelling {
	const derived = parts && JSON.stringify(spelled(parts)) === JSON.stringify(paragraphs);
	return {
		...(derived ? {} : { paragraphs }),
		...(parts
			? {
					parts: parts.map((row) =>
						row.map(({ key, ...p }) => (key === p.text ? p : { ...p, key }))
					)
				}
			: {})
	};
}

function unpackTelling({ paragraphs, parts }: PackedTelling): Telling {
	const full = parts?.map((row) => row.map((p) => ({ ...p, key: p.key ?? p.text })));
	return { paragraphs: paragraphs ?? spelled(full ?? []), ...(full ? { parts: full } : {}) };
}

export function packWorld(world: AdventureWorld): PackedWorld {
	const things: Thing[] = [];
	const index = new Map<string, number>();
	const ref = (thing: Thing) => {
		const said = JSON.stringify(thing);
		if (!index.has(said)) index.set(said, things.push(thing) - 1);
		return index.get(said)!;
	};
	const stops: Record<StopId, PackedStop> = {};
	for (const [id, stop] of Object.entries(world.stops)) {
		const { paragraphs, parts, plain, things: seen, streets, hidden, ...rest } = stop;
		stops[id] = {
			...rest,
			...packTelling({ paragraphs, parts }),
			things: seen.map(ref),
			...(streets ? { streets: streets.map(ref) } : {}),
			...(hidden ? { hidden: { lines: hidden.lines, things: hidden.things.map(ref) } } : {}),
			...(plain ? { plain: packTelling(plain) } : {})
		};
	}
	return { ...world, things, stops };
}

export function unpackWorld({ things, stops, ...world }: PackedWorld): AdventureWorld {
	const thing = (i: number) => things[i];
	const unpacked: Record<StopId, CompiledStop> = {};
	for (const [id, stop] of Object.entries(stops)) {
		const { paragraphs, parts, plain, things: seen, streets, hidden, ...rest } = stop;
		unpacked[id] = {
			...rest,
			...unpackTelling({ paragraphs, parts }),
			things: seen.map(thing),
			...(streets ? { streets: streets.map(thing) } : {}),
			...(hidden ? { hidden: { lines: hidden.lines, things: hidden.things.map(thing) } } : {}),
			...(plain ? { plain: unpackTelling(plain) } : {})
		};
	}
	return { ...world, stops: unpacked };
}
