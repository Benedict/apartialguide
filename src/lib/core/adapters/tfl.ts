import type { Fact } from '../facts';
import { distance, type LatLon } from '../geo';

/** One disruption on the roads, as TfL's Road Disruption feed answers. */
export interface TflDisruption {
	id: string;
	category?: string;
	subCategory?: string;
	/** What is happening, in TfL's words. */
	comments?: string;
	endDateTime?: string;
	lastModifiedTime?: string;
	geography?: { coordinates?: number[] };
	streets?: { segments?: { lineString?: string }[] }[];
}

/** Every point TfL places a disruption at, as latitude and longitude. */
function pointsOf(d: TflDisruption): LatLon[] {
	const points: LatLon[] = [];
	const at = d.geography?.coordinates;
	if (at) points.push([at[1], at[0]]);
	for (const street of d.streets ?? [])
		for (const segment of street.segments ?? []) {
			try {
				for (const [lon, lat] of JSON.parse(segment.lineString ?? '[]') as [number, number][])
					points.push([lat, lon]);
			} catch {
				// A line TfL gives that cannot be read is left out, not guessed at.
			}
		}
	return points;
}

/**
 * The disruptions on the roads within reach of a place and not yet over, as facts kept by TfL:
 * what kind, its words as TfL gives them, when it ends, and how far off it lies.
 */
export function disruptionFacts(
	disruptions: readonly TflDisruption[],
	at: LatLon,
	now: string,
	withinMetres = 200
): Fact[] {
	return disruptions.flatMap((d) => {
		if (!d.comments || !d.endDateTime || d.endDateTime <= now) return [];
		const metres = Math.min(...pointsOf(d).map((p) => distance(at, p)));
		if (!(metres <= withinMetres)) return [];
		const subject = `tfl/${d.id}`;
		const observed = (d.lastModifiedTime ?? now).slice(0, 10);
		const claims: [string, string | undefined][] = [
			['category', d.category],
			['subcategory', d.subCategory],
			['comments', d.comments],
			['end', d.endDateTime],
			['metres', String(Math.round(metres))]
		];
		return claims
			.filter((c): c is [string, string] => !!c[1])
			.map(([key, value]) => ({
				id: `${subject}:${key}`,
				subject,
				claim: { key, value },
				source: 'TfL',
				observed,
				reach: 0,
				geometry: []
			}));
	});
}

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
