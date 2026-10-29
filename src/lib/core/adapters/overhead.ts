import { Body, Equator, Horizon, Observer } from 'astronomy-engine';
import {
	ecfToLookAngles,
	eciToEcf,
	eciToGeodetic,
	gstime,
	json2satrec,
	propagate
} from 'satellite.js';
import type { Fact } from '../facts';
import { distance } from '../geo';

/** Where something overhead is asked about: the map's own place, never the reader's. */
export interface Overhead {
	latitude: number;
	longitude: number;
}

const fact = (
	subject: string,
	key: string,
	value: string | number,
	source: string,
	observed: string
): Fact => ({
	id: `${subject}:${key}`,
	subject,
	claim: { key, value: String(value) },
	source,
	observed,
	reach: 0,
	geometry: []
});

const PLANETS = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];

/** The planets the eye can find that stand above the horizon now: worked out, not asked of anyone. */
export function planetFacts(date: Date, at: Overhead | undefined): Fact[] {
	if (!at) return [];
	const observer = new Observer(at.latitude, at.longitude, 0);
	const observed = date.toISOString();
	return PLANETS.flatMap((body) => {
		const sky = Equator(body, date, observer, true, true);
		const { altitude, azimuth } = Horizon(date, observer, sky.ra, sky.dec, 'normal');
		if (altitude <= 0) return [];
		const subject = `planet/${body}`;
		const source = 'calculated, after Astronomy Engine';
		return [
			fact(subject, 'name', body, source, observed),
			fact(subject, 'altitude', altitude.toFixed(1), source, observed),
			fact(subject, 'azimuth', azimuth.toFixed(0), source, observed)
		];
	});
}

/** One satellite's orbital elements, as CelesTrak publishes them (OMM, in JSON). */
export interface Omm {
	OBJECT_NAME: string;
	NORAD_CAT_ID: number;
	[key: string]: string | number;
}

/** Above this many degrees a satellite is clear of the roofs. */
const CLEAR = 10;

/** The satellites above the horizon now, from their published elements: name, height, where in the sky. */
export function satelliteFacts(
	elements: readonly Omm[],
	date: Date,
	at: Overhead | undefined
): Fact[] {
	if (!at) return [];
	const toRad = Math.PI / 180;
	const observer = { latitude: at.latitude * toRad, longitude: at.longitude * toRad, height: 0 };
	const gmst = gstime(date);
	const observed = date.toISOString();
	return elements
		.flatMap((omm) => {
			try {
				const now = propagate(json2satrec(omm as never), date);
				const position = now?.position;
				if (!position || typeof position === 'boolean') return [];
				const look = ecfToLookAngles(observer, eciToEcf(position, gmst));
				const height = eciToGeodetic(position, gmst).height;
				const elevation = look.elevation / toRad;
				if (!(elevation > CLEAR) || !Number.isFinite(height)) return [];
				return [{ omm, elevation, azimuth: look.azimuth / toRad, height }];
			} catch {
				return [];
			}
		})
		.sort((a, b) => b.elevation - a.elevation)
		.flatMap(({ omm, elevation, azimuth, height }) => {
			const subject = `satellite/${omm.NORAD_CAT_ID}`;
			return [
				fact(subject, 'name', omm.OBJECT_NAME, 'CelesTrak', observed),
				fact(subject, 'elevation', elevation.toFixed(0), 'CelesTrak', observed),
				fact(subject, 'azimuth', azimuth.toFixed(0), 'CelesTrak', observed),
				fact(subject, 'height', height.toFixed(0), 'CelesTrak', observed)
			];
		});
}

/** One aircraft, as adsb.lol answers: what it broadcasts of itself. */
export interface Aircraft {
	hex?: string;
	flight?: string;
	alt_baro?: number | string;
	track?: number;
	lat?: number;
	lon?: number;
}

/** How far away an aircraft can be and still be overhead, in metres. */
const NEAR = 10_000;

/** The aircraft aloft near the map's place, nearest first, by the call sign each broadcasts. */
export function flightFacts(
	answer: { ac?: Aircraft[] },
	at: Overhead | undefined,
	observed: string
): Fact[] {
	if (!at) return [];
	return (answer.ac ?? [])
		.flatMap((a) => {
			const callsign = a.flight?.trim();
			if (!callsign || typeof a.alt_baro !== 'number' || a.lat === undefined || a.lon === undefined)
				return [];
			const metres = distance([at.latitude, at.longitude], [a.lat, a.lon]);
			return metres <= NEAR ? [{ a, callsign, metres }] : [];
		})
		.sort((x, y) => x.metres - y.metres)
		.flatMap(({ a, callsign }) => {
			const subject = `flight/${a.hex ?? callsign}`;
			return [
				fact(subject, 'callsign', callsign, 'adsb.lol', observed),
				fact(subject, 'altitude', a.alt_baro as number, 'adsb.lol', observed),
				...(a.track === undefined
					? []
					: [fact(subject, 'track', Math.round(a.track), 'adsb.lol', observed)])
			];
		});
}
