import { groupBySubject, type Fact } from '../facts';
import type { Narrator } from '../narrator';
import type { Part, Thing } from '../render/renderer';
import type { StopId } from '../stops';
import { looksBroken, NAME_KEY } from '../tensions';

export interface CompiledExit {
	label: string;
	to: StopId;
	street?: string;
}

export interface CompiledStop {
	title: string;
	paragraphs: string[];
	/** The paragraphs as labelled parts, so the game can leave out what was just said. */
	parts?: Part[][];
	exits: CompiledExit[];
	things: Thing[];
	/** The street or streets underfoot, to examine. */
	streets?: Thing[];
	/** Bus and tram stops in view, for live departures. */
	transit?: TransitStop[];
	/** Distinctive words in the names spoken here, each with the name as found, for chance. */
	terms?: Term[];
	/** Broken names spoken here, for Guide to carry on. */
	fragments?: string[];
	/** Where the map puts the stop, as latitude and longitude. */
	at?: [number, number];
	/** The area another account puts this stop in, such as a ward. */
	area?: { name: string; kind: string };
	/** Other areas another account draws over this stop, such as flood zones: any number at once. */
	zones?: { name: string; kind: string }[];
	/** What a closer look finds, if anything is hidden here. */
	hidden?: { lines: string[]; things: Thing[] };
}

/** A stop on the map that TfL has live arrivals for. */
export interface TransitStop {
	/** As the map names it. */
	name: string;
	kind: 'bus' | 'tram';
	/** The NaPTAN code the map gives it, which TfL uses too. Tram stops on the map have none. */
	naptan?: string;
}

/** The bus and tram stops in view, once each. */
function transitIn(facts: readonly Fact[]): TransitStop[] {
	const stops = new Map<string, TransitStop>();
	for (const group of groupBySubject(facts).values()) {
		const tags = Object.fromEntries(group.map((f) => [f.claim.key, f.claim.value]));
		if (!tags.name) continue;
		const stop: TransitStop | undefined =
			tags.highway === 'bus_stop' && tags['naptan:AtcoCode']
				? { name: tags.name, kind: 'bus', naptan: tags['naptan:AtcoCode'] }
				: tags.railway === 'tram_stop'
					? { name: tags.name, kind: 'tram' }
					: undefined;
		if (stop) stops.set(`${stop.kind}:${stop.naptan ?? stop.name}`, stop);
	}
	return [...stops.values()];
}

/** A word that few names in the map share, and the name it was found in. */
export interface Term {
	term: string;
	said: string;
	/** Whether the name is a street's. */
	street?: boolean;
}

/** Words too common in place names to connect anything. */
const GENERIC = new Set(
	'road street lane avenue close crescent drive gardens grove place park parade terrace court square hall house church chapel station halt railway line tram stop ward area village shopping centre recreation ground surgery school walk passage cafe food branch parking office shop store market north south east west lower upper great little'.split(
		' '
	)
);
/** A word shared by more names than this says nothing in particular. */
const MOST_NAMES = 3;

const wordsOf = (name: string) =>
	[...new Set(name.split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && /^\p{Lu}/u.test(w)))]
		.map((w) => w.toLowerCase())
		.filter((w) => !GENERIC.has(w));

/** Every stop's narration, written ahead of time. The game plays from this alone. */
/** What Guide carries, as the introduction tells it: every figure from the data. */
export interface Ledger {
	/** Named streets on the map. */
	streets: number;
	/** Places to stand: the stops. */
	places: number;
	/** The earliest date anything on the map was last recorded, YYYY-MM-DD. */
	oldest?: string;
	/** Other accounts kept of the place, by their keepers' names. */
	accounts: string[];
	/** The areas another account draws: how many the map runs into, and those most of it lies in. */
	areas?: { kind: string; count: number; most: string[] };
}

export interface AdventureWorld {
	start: StopId;
	stops: Record<StopId, CompiledStop>;
	/** The date of the map Guide carries, YYYY-MM-DD. */
	asOf?: string;
	/** What Guide carries, for the introduction. */
	about?: Ledger;
	/** Where to ask about today's weather: where the tour begins. */
	weatherAt?: { latitude: number; longitude: number };
}

export function compileWorld(
	narrator: Narrator,
	start: StopId,
	options: { asOf?: string } = {}
): AdventureWorld {
	const stops: Record<StopId, CompiledStop> = {};
	const names = new Map<StopId, { said: string; street?: boolean }[]>();
	for (const stop of narrator.graph.all()) {
		const { room, plan, scene, inView } = narrator.visit(stop.id)!;
		const transit = transitIn(inView);
		const area = narrator.areaAt(stop.position);
		const zones = narrator.zonesAt(stop.position).map(({ name, kind }) => ({ name, kind }));
		const things = plan.beats.flatMap((b) =>
			b.facts
				.filter((f) => ['name', 'wikidata:label', 'etymology:label'].includes(f.claim.key))
				.map((f) => ({ said: f.claim.value }))
		);
		names.set(stop.id, [...things, ...scene.here.map((said) => ({ said, street: true }))]);
		const fragments = [
			...new Set(
				plan.beats
					.filter((b) => b.effects.includes('spoken-as-found'))
					.flatMap((b) => b.facts)
					.filter((f) => NAME_KEY.test(f.claim.key) && looksBroken(f.claim.value))
					.map((f) => f.claim.value)
			)
		];
		stops[stop.id] = {
			title: room.title,
			paragraphs: room.paragraphs,
			at: [+stop.position[0].toFixed(5), +stop.position[1].toFixed(5)],
			...(room.parts ? { parts: room.parts } : {}),
			exits: stop.exits.map(({ label, to, street }) => ({ label, to, street })),
			things: room.things,
			...(room.streets?.length ? { streets: room.streets } : {}),
			...(room.hidden ? { hidden: room.hidden } : {}),
			...(fragments.length ? { fragments } : {}),
			...(transit.length ? { transit } : {}),
			...(area ? { area: { name: area.name, kind: area.kind } } : {}),
			...(zones.length ? { zones } : {})
		};
	}
	// How many distinct names in the whole map share each word: a word in few is distinctive.
	const shared = new Map<string, Set<string>>();
	for (const list of names.values())
		for (const { said } of list)
			for (const w of wordsOf(said)) shared.set(w, (shared.get(w) ?? new Set()).add(said));
	for (const [id, list] of names) {
		const terms = list.flatMap(({ said, street }) =>
			wordsOf(said)
				.filter((term) => (shared.get(term)?.size ?? 0) <= MOST_NAMES)
				.map((term) => ({ term, said, ...(street ? { street } : {}) }))
		);
		if (terms.length) stops[id].terms = terms;
	}
	const about = ledger(narrator, stops);
	const begins = narrator.graph.get(start)?.position;
	return {
		start,
		stops,
		...(options.asOf ? { asOf: options.asOf } : {}),
		about,
		...(begins
			? { weatherAt: { latitude: +begins[0].toFixed(4), longitude: +begins[1].toFixed(4) } }
			: {})
	};
}

/** What Guide carries, from the narrator's ledger and the stops: the areas counted where stops lie. */
function ledger(narrator: Narrator, stops: Record<StopId, CompiledStop>): Ledger {
	const { streets, oldest, accounts } = narrator.ledger;
	const inArea = new Map<string, number>();
	let kind: string | undefined;
	for (const stop of Object.values(stops))
		if (stop.area) {
			kind = stop.area.kind;
			inArea.set(stop.area.name, (inArea.get(stop.area.name) ?? 0) + 1);
		}
	const most = [...inArea]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 2)
		.map(([name]) => name);
	return {
		streets,
		places: Object.keys(stops).length,
		...(oldest ? { oldest } : {}),
		accounts,
		...(kind ? { areas: { kind, count: inArea.size, most } } : {})
	};
}
