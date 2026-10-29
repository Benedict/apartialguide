import { describe, expect, it } from 'vitest';
import {
	degreesLat,
	degreesLong,
	eciToGeodetic,
	gstime,
	json2satrec,
	propagate
} from 'satellite.js';
import { flightFacts, planetFacts, satelliteFacts, type Omm } from './overhead';

const at = { latitude: 51.5, longitude: -0.1 };
const when = new Date('2026-10-29T19:39:35Z');
const of = (facts: { subject: string; claim: { key: string; value: string } }[], subject: string) =>
	Object.fromEntries(
		facts.filter((f) => f.subject === subject).map((f) => [f.claim.key, f.claim.value])
	);

// Orbital elements as published, for an invented object on the station's orbit.
const invented: Omm = {
	OBJECT_NAME: 'INVENTED SAT',
	OBJECT_ID: '1998-067A',
	EPOCH: '2026-10-28T14:18:15.597504',
	MEAN_MOTION: 15.49090321,
	ECCENTRICITY: 0.00069949,
	INCLINATION: 51.6336,
	RA_OF_ASC_NODE: 359.9178,
	ARG_OF_PERICENTER: 320.4528,
	MEAN_ANOMALY: 39.5949,
	EPHEMERIS_TYPE: 0,
	CLASSIFICATION_TYPE: 'U',
	NORAD_CAT_ID: 99999,
	ELEMENT_SET_NO: 999,
	REV_AT_EPOCH: 59243,
	BSTAR: 0.00011161276,
	MEAN_MOTION_DOT: 5.724e-5,
	MEAN_MOTION_DDOT: 0
};

describe('planetFacts', () => {
	it('gives each planet above the horizon now, where it stands, worked out not asked', () => {
		const facts = planetFacts(when, at);
		expect(facts.length).toBeGreaterThan(0);
		for (const f of facts) {
			expect(f.source).toMatch(/calculated/);
			expect(f.observed).toBe(when.toISOString());
		}
		const altitudes = facts.filter((f) => f.claim.key === 'altitude').map((f) => +f.claim.value);
		expect(altitudes.every((a) => a > 0)).toBe(true);
		expect(facts.some((f) => f.claim.key === 'name' && f.claim.value === 'Saturn')).toBe(true);
	});
});

describe('satelliteFacts', () => {
	const below = (date: Date) => {
		const p = propagate(json2satrec(invented as never), date)!;
		const geo = eciToGeodetic(p.position as never, gstime(date));
		return { latitude: degreesLat(geo.latitude), longitude: degreesLong(geo.longitude) };
	};

	it('finds a satellite straight overhead, by its name as published, and how high it is', () => {
		const facts = satelliteFacts([invented], when, below(when));
		const sat = of(facts, 'satellite/99999');
		expect(sat.name).toBe('INVENTED SAT');
		expect(+sat.elevation).toBeGreaterThan(80);
		expect(+sat.height).toBeGreaterThan(400);
		expect(+sat.height).toBeLessThan(440);
		expect(facts[0].source).toBe('CelesTrak');
	});

	it('says nothing of a satellite below the horizon', () => {
		const under = below(when);
		expect(
			satelliteFacts([invented], when, {
				latitude: -under.latitude,
				longitude: under.longitude + 180
			})
		).toEqual([]);
	});

	it('passes over elements it cannot read', () => {
		expect(satelliteFacts([{ ...invented, MEAN_MOTION: Number.NaN }], when, at)).toEqual([]);
	});
});

describe('flightFacts', () => {
	const answer = {
		ac: [
			{ hex: 'a', flight: 'INV123  ', alt_baro: 5800, track: 91, lat: 51.51, lon: -0.1 },
			{ hex: 'b', flight: 'INV9    ', alt_baro: 'ground', track: 0, lat: 51.5, lon: -0.1 },
			{ hex: 'c', flight: 'FAR1', alt_baro: 30000, track: 180, lat: 52.5, lon: -0.1 },
			{ hex: 'd', alt_baro: 12000, track: 300, lat: 51.52, lon: -0.12 }
		]
	};

	it('gives the aircraft aloft close by, nearest first, by the call sign they broadcast', () => {
		const facts = flightFacts(answer, at, '2026-10-29T19:39:35Z');
		expect(of(facts, 'flight/a')).toMatchObject({
			callsign: 'INV123',
			altitude: '5800',
			track: '91'
		});
		expect(facts.some((f) => f.subject === 'flight/b')).toBe(false);
		expect(facts.some((f) => f.subject === 'flight/c')).toBe(false);
		expect(facts.some((f) => f.subject === 'flight/d')).toBe(false);
		expect(facts[0].source).toBe('adsb.lol');
	});

	it('is nothing without an answer', () => {
		expect(flightFacts({}, at, '2026-10-29T19:39:35Z')).toEqual([]);
	});
});
