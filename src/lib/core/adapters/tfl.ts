import type { Fact } from '../facts';

/** One predicted arrival, as TfL's StopPoint Arrivals answers. */
export interface TflArrival {
	id?: string;
	lineName?: string;
	destinationName?: string;
	/** Seconds until it reaches the stop. */
	timeToStation?: number;
	modeName?: string;
	/** Which way the stop serves, as TfL puts it: "Purley". */
	towards?: string;
	/** The stop's letter, as on its flag: "Q". TfL gives "null" where there is none. */
	platformName?: string;
}

/** TfL's way of saying it has nothing to say. */
const said = (value: string | undefined) => (value && value !== 'null' ? value : undefined);

/** Each predicted arrival at a stop as facts about that arrival, from TfL, observed now. */
export function arrivalFacts(
	arrivals: readonly TflArrival[],
	stop: string,
	observed: string
): Fact[] {
	return arrivals.flatMap((a, i) => {
		if (!a.lineName || a.timeToStation === undefined) return [];
		const subject = `tfl/${a.id ?? i}`;
		const claims: [string, string | number | undefined][] = [
			['line', a.lineName],
			['destination', a.destinationName],
			['due', a.timeToStation],
			['mode', a.modeName],
			['stop', stop],
			['towards', said(a.towards)],
			['platform', said(a.platformName)]
		];
		return claims
			.filter((c): c is [string, string | number] => c[1] !== undefined && c[1] !== '')
			.map(([key, value]) => ({
				id: `${subject}:${key}`,
				subject,
				claim: { key, value: String(value) },
				source: 'TfL',
				observed,
				reach: 0,
				geometry: []
			}));
	});
}
