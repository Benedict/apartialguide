import type { StopId } from '../stops';

/** A name the reader may give to say where they would like to begin. */
export interface Place {
	/** As the map has it. */
	name: string;
	kind: 'street' | 'place' | 'postcode';
	/** The stop nearest it. */
	at: StopId;
}

export type Found =
	/** `near` names the postcode sector it fell back on, when the postcode itself is not on the map. */
	| { kind: 'found'; at: StopId; near?: string }
	| { kind: 'choose'; names: string[] }
	| { kind: 'none' };

const plain = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^\p{L}\p{N} ]/gu, '')
		.replace(/^the /, '')
		.replace(/\s+/g, ' ')
		.trim();
const squeezed = (s: string) => s.toUpperCase().replace(/\s+/g, '');
/** The first half of a UK postcode: "CR0", "SW1A". */
const OUTWARD = /^[A-Z]{1,2}\d[A-Z\d]?$/;
/** A whole one, split into its sector ("CR0" and "6") and unit ("RA"). */
const WHOLE = /^([A-Z]{1,2}\d[A-Z\d]?)(\d)[A-Z]{2}$/;

/** Looks a reader's words up among the places the map has, and nowhere else. */
export function findPlace(places: readonly Place[], query: string): Found {
	const q = plain(query);
	if (!q) return { kind: 'none' };

	const postcodes = places.filter((p) => p.kind === 'postcode');
	const code = squeezed(query);
	const exact = postcodes.find((p) => squeezed(p.name) === code);
	if (exact) return { kind: 'found', at: exact.at };
	const whole = WHOLE.exec(code);
	if (whole) {
		const sector = whole[1] + whole[2];
		const neighbours = postcodes.filter((p) => squeezed(p.name).slice(0, -2) === sector);
		if (neighbours.length)
			return {
				kind: 'found',
				at: commonest(neighbours.map((p) => p.at)),
				near: `${whole[1]} ${whole[2]}`
			};
	}
	if (OUTWARD.test(code)) {
		const district = postcodes.filter((p) => squeezed(p.name).slice(0, -3) === code);
		if (district.length) return { kind: 'found', at: commonest(district.map((p) => p.at)) };
	}

	const named = places.filter((p) => p.kind !== 'postcode');
	const same = named.find((p) => plain(p.name) === q);
	if (same) return { kind: 'found', at: same.at };
	const partial = named.filter((p) => plain(p.name).includes(q));
	const names = [...new Set(partial.map((p) => p.name))].sort((a, b) => a.localeCompare(b));
	if (names.length === 1) return { kind: 'found', at: partial[0].at };
	if (names.length > 1) return { kind: 'choose', names };
	return { kind: 'none' };
}

function commonest(ids: StopId[]): StopId {
	const counts = new Map<StopId, number>();
	for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
	return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}
