import type { SourceRecord } from '../../core/adapters/records';
import { inBox, point, said } from './box';

/** One row of the Department for Transport's average annual daily flow, as its file gives it. */
export type FlowRow = Record<string, string>;

/** How near a road the map has must be to a count point on it, in metres: a road named by its number. */
export const NUMBERED_WITHIN = 40;
/** A minor road, which the count names only as a class (U, C): the road the map has where it lies. */
export const MINOR_WITHIN = 25;
/** The roads a count point on a minor road may lie on: never a footway or a pavement beside it. */
export const ROADS = [
	'motorway',
	'trunk',
	'primary',
	'secondary',
	'tertiary',
	'unclassified',
	'residential',
	'living_street',
	'service',
	'motorway_link',
	'trunk_link',
	'primary_link',
	'secondary_link',
	'tertiary_link'
];

/**
 * Each count point's latest year in the box: how many motor vehicles and bicycles pass on an
 * average day, counted or estimated, as found. It goes with the road the map numbers as the count
 * does (A23), or, on a minor road the count names only by its class, the road the map has where it
 * lies; never standing alone.
 */
export function trafficRecords(rows: readonly FlowRow[], bbox: string): SourceRecord[] {
	const latest = new Map<string, FlowRow>();
	for (const r of rows) {
		const was = latest.get(r.count_point_id);
		if (!was || Number(r.year) > Number(was.year)) latest.set(r.count_point_id, r);
	}
	const records: SourceRecord[] = [];
	for (const r of latest.values()) {
		const at = point(r.latitude, r.longitude);
		if (!at || !inBox(at, bbox) || !/^\d{4}$/.test(r.year)) continue;
		const numbered = /^[AB]\d+/.test(r.road_name ?? '') || /^M\d+/.test(r.road_name ?? '');
		records.push({
			id: r.count_point_id,
			at,
			observed: `${r.year}-12-31`,
			near: numbered
				? { key: 'ref', value: r.road_name, within: NUMBERED_WITHIN }
				: { key: 'highway', value: ROADS, within: MINOR_WITHIN },
			claims: said({
				year: r.year,
				vehicles: r.all_motor_vehicles,
				cycles: r.pedal_cycles,
				method: r.estimation_method
			})
		});
	}
	return records;
}
