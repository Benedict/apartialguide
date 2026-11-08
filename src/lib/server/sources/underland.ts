/**
 * Underland's records for the walk, made from the dated files Underground's fetchers wrote: the BGS
 * index of mine plans, Hunt's returns, and what lies beneath (BGS's boreholes and rocks). Each
 * becomes a store the walk reads as any other (`RECORDS_DIR`): a mine's plans of the ground itself
 * and its returns as zones over that ground, the rocks as zones, boreholes as things standing alone.
 * Every name and figure as found; only the words around them are the walk's.
 */
import type { AreaRecord } from '../../core/areas';
import type { LatLon } from '../../core/geo';
import type { RecordStore, SourceRecord } from '../../core/adapters/records';

interface Dated {
	source: string;
	licence: string;
	retrieved: string;
}
export interface PlanStore extends Dated {
	plans: {
		id: string;
		title: string;
		mine?: string;
		kind?: string;
		mineral?: string;
		abandoned?: string;
		ring: LatLon[];
	}[];
}
export interface LedgerStore extends Dated {
	returns: {
		mine: string;
		year: string;
		ore: { tons: number; cwts: number };
		lead: { tons: number; cwts: number };
		silver?: number;
	}[];
	copper?: {
		mine: string;
		year: string;
		ore: number;
		copper: { tons: number; cwts: number; qrs: number; lbs: number };
		pounds?: number;
	}[];
}
export interface MarkStore extends Dated {
	marks: { ref: string; kind: string; name?: string; at: LatLon }[];
}
export interface BeneathStore extends Dated {
	boreholes: { ref: string; name?: string; depth?: number; year?: string; at: LatLon }[];
	rocks: {
		layer: 'bedrock' | 'superficial';
		name: string;
		rock?: string;
		age?: string;
		parts: LatLon[][][];
	}[];
}

/** A plan of more ground than this is filed for a whole sheet or district, not drawn of a place. */
const GROUND_KM2 = 20;

function areaKm2(ring: readonly LatLon[]): number {
	const k = Math.cos((ring[0][0] * Math.PI) / 180) * 111.32;
	let twice = 0;
	for (let i = 1; i < ring.length; i++) {
		const [y1, x1] = ring[i - 1];
		const [y2, x2] = ring[i];
		twice += x1 * k * (y2 * 111.32) - x2 * k * (y1 * 111.32);
	}
	return Math.abs(twice) / 2;
}

/** Words that say what a mine was rather than which: left out, so names can be matched. */
const GENERIC = /\b(lead|mines?|co|company)\b/g;
/** A mine's name as a key: lower case, without what it was, run together (as Underground keys it). */
export const nameKey = (name: string) =>
	name
		.toLowerCase()
		// Hunt's Huel is the plans' and the map's Wheal: for the match alone, never in what is said.
		.replace(/\bhuel\b/g, 'wheal')
		.replace(GENERIC, '')
		.replace(/[^\p{L}\p{N}]+/gu, '');

const listOf = (words: string[]) =>
	words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

/** Each mine's plans of the ground itself, as one zone over all that ground. */
export function mineZones(store: PlanStore): RecordStore {
	const byMine = new Map<string, PlanStore['plans']>();
	for (const p of store.plans) {
		// The mine, as the index's description names it; else the plan's title, as found.
		const mine = p.mine ?? p.title;
		if (mine && p.ring.length > 3 && areaKm2(p.ring) < GROUND_KM2)
			byMine.set(mine, [...(byMine.get(mine) ?? []), p]);
	}
	const areas: AreaRecord[] = [...byMine].map(([mine, ps], i) => {
		const kinds = [...new Set(ps.map((p) => p.kind ?? 'plan'))];
		const minerals = [...new Set(ps.map((p) => p.mineral).filter((m): m is string => !!m))];
		const years = ps.map((p) => p.abandoned).filter((y): y is string => !!y && /^\d{4}$/.test(y));
		return {
			id: `mine-${i}`,
			name: mine,
			kind: 'mine plans',
			rings: ps.map((p) => p.ring),
			claims: {
				plans: String(ps.length),
				kinds: kinds.length === 1 ? kinds[0] : 'plan',
				...(minerals.length ? { minerals: listOf(minerals) } : {}),
				...(years.length ? { abandoned: years.sort().at(-1)! } : {})
			}
		};
	});
	return {
		source: store.source,
		prefix: 'mine',
		retrieved: store.retrieved,
		records: [],
		overlay: true,
		areas
	};
}

const weight = ({ tons, cwts }: { tons: number; cwts: number }) =>
	[tons ? `${tons} ton${tons === 1 ? '' : 's'}` : '', cwts ? `${cwts} cwts` : '']
		.filter(Boolean)
		.join(' ') || 'none';

/** How near the map's thing of a mark's name must be to be the mark itself, in metres. */
const MARK_WITHIN = 15;

/**
 * A mine's returns: laid over the ground its plans were drawn of, where its name matches one;
 * else given to the map's mark of its name, its shaft or level told by kind and name alone. A
 * mine whose name matches neither is not told: a misread name is never given to anything.
 */
export function returnZones(
	ledger: LedgerStore,
	mines: RecordStore,
	marks: MarkStore = { source: '', licence: '', retrieved: '', marks: [] }
): RecordStore {
	const named = new Map<string, MarkStore['marks'][number]>();
	for (const m of marks.marks)
		if (m.name && !named.has(nameKey(m.name))) named.set(nameKey(m.name), m);
	const records: SourceRecord[] = [];
	const ground = new Map((mines.areas ?? []).map((a) => [nameKey(a.name), a.rings]));
	const byMine = new Map<string, Record<string, string>>();
	const claimsOf = (mine: string) => {
		const c = byMine.get(mine) ?? {};
		byMine.set(mine, c);
		return c;
	};
	for (const r of ledger.returns) {
		const claims = claimsOf(r.mine);
		claims[`${r.year}.ore`] = weight(r.ore);
		claims[`${r.year}.lead`] = weight(r.lead);
		if (r.silver !== undefined) claims[`${r.year}.silver`] = String(r.silver);
	}
	const n = (x: number) => x.toLocaleString('en-GB');
	for (const r of ledger.copper ?? []) {
		const claims = claimsOf(r.mine);
		const { tons, cwts, qrs, lbs } = r.copper;
		claims[`${r.year}.copper ore`] = `${n(r.ore)} ton${r.ore === 1 ? '' : 's'}`;
		claims[`${r.year}.copper`] =
			[
				tons ? `${n(tons)} ton${tons === 1 ? '' : 's'}` : '',
				cwts ? `${cwts} cwts` : '',
				qrs ? `${qrs} qrs` : '',
				lbs ? `${lbs} lbs` : ''
			]
				.filter(Boolean)
				.join(' ') || 'none';
		if (r.pounds !== undefined) claims[`${r.year}.pounds`] = n(r.pounds);
	}
	const areas: AreaRecord[] = [];
	for (const [mine, claims] of byMine) {
		const rings = ground.get(nameKey(mine));
		const mark = named.get(nameKey(mine));
		if (rings)
			areas.push({
				id: `returns-${areas.length}`,
				name: mine,
				kind: 'mine returns',
				rings,
				claims
			});
		else if (mark?.name)
			records.push({
				id: `hunt-${records.length}`,
				at: mark.at,
				near: { key: 'name', value: mark.name, within: MARK_WITHIN },
				claims: { mine, ...claims }
			});
	}
	return {
		source: ledger.source,
		prefix: 'returns',
		retrieved: ledger.retrieved,
		records,
		// Returns go only with the map's own mark of their name, never as a thing of their own.
		standalone: false,
		overlay: true,
		areas
	};
}

/** Boreholes with a name, standing alone where the index puts them. */
export function boreholeRecords(store: BeneathStore): RecordStore {
	const records: SourceRecord[] = store.boreholes
		.filter((b) => b.name)
		.map((b) => ({
			id: b.ref,
			at: b.at,
			claims: {
				name: b.name!,
				kind: 'borehole',
				...(b.depth !== undefined ? { depth: String(b.depth) } : {}),
				...(b.year ? { year: b.year } : {})
			}
		}));
	return { source: store.source, prefix: 'borehole', retrieved: store.retrieved, records };
}

/** The rocks beneath, bedrock and what lies over it, as zones, each part's holes kept. */
export function rockZones(store: BeneathStore): RecordStore {
	const areas: AreaRecord[] = store.rocks.map((r, i) => ({
		id: `rock-${i}`,
		name: r.name,
		kind: r.layer === 'bedrock' ? 'bedrock' : 'superficial deposits',
		rings: r.parts.map((p) => p[0]),
		holes: r.parts.flatMap((p) => p.slice(1)),
		claims: { ...(r.rock ? { rock: r.rock } : {}), ...(r.age ? { age: r.age } : {}) }
	}));
	return {
		source: store.source,
		prefix: 'rock',
		retrieved: store.retrieved,
		records: [],
		overlay: true,
		areas
	};
}
