/**
 * Where the sun and moon are, worked out from the date and the place: the formulas of SunCalc
 * (Vladimir Agafonkin, BSD-2-Clause), after Astronomy Answers. Angles are in degrees; azimuth is
 * measured clockwise from north. The moon's altitude is not corrected for refraction.
 */

const rad = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = rad * 23.4397;

export interface SkyPosition {
	altitude: number;
	azimuth: number;
}

const toDays = (date: Date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;

const rightAscension = (l: number, b: number) =>
	Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
const declination = (l: number, b: number) =>
	Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
const siderealTime = (d: number, lw: number) => rad * (280.16 + 360.9856235 * d) - lw;

function solarMeanAnomaly(d: number): number {
	return rad * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(m: number): number {
	const centre = rad * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
	return m + centre + rad * 102.9372 + Math.PI;
}

function sunCoords(d: number) {
	const l = eclipticLongitude(solarMeanAnomaly(d));
	return { dec: declination(l, 0), ra: rightAscension(l, 0) };
}

function moonCoords(d: number) {
	const l = rad * (218.316 + 13.176396 * d);
	const m = rad * (134.963 + 13.064993 * d);
	const f = rad * (93.272 + 13.22935 * d);
	const lng = l + rad * 6.289 * Math.sin(m);
	const lat = rad * 5.128 * Math.sin(f);
	return {
		ra: rightAscension(lng, lat),
		dec: declination(lng, lat),
		dist: 385_001 - 20_905 * Math.cos(m)
	};
}

function position(
	date: Date,
	latitude: number,
	longitude: number,
	coords: { ra: number; dec: number }
): SkyPosition {
	const phi = rad * latitude;
	const h = siderealTime(toDays(date), rad * -longitude) - coords.ra;
	const azimuth = Math.atan2(
		Math.sin(h),
		Math.cos(h) * Math.sin(phi) - Math.tan(coords.dec) * Math.cos(phi)
	);
	const altitude = Math.asin(
		Math.sin(phi) * Math.sin(coords.dec) + Math.cos(phi) * Math.cos(coords.dec) * Math.cos(h)
	);
	return { altitude: altitude / rad, azimuth: (azimuth / rad + 180 + 360) % 360 };
}

export function sunPosition(date: Date, latitude: number, longitude: number): SkyPosition {
	return position(date, latitude, longitude, sunCoords(toDays(date)));
}

export function moonPosition(date: Date, latitude: number, longitude: number): SkyPosition {
	return position(date, latitude, longitude, moonCoords(toDays(date)));
}

/** How much of the moon is lit (0 to 1), and where it is in its month (0 new, 0.5 full). */
export function moonIllumination(date: Date): { fraction: number; phase: number } {
	const d = toDays(date);
	const s = sunCoords(d);
	const m = moonCoords(d);
	const sdist = 149_598_000;
	const phi = Math.acos(
		Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)
	);
	const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
	const angle = Math.atan2(
		Math.cos(s.dec) * Math.sin(s.ra - m.ra),
		Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra)
	);
	return {
		fraction: (1 + Math.cos(inc)) / 2,
		phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI
	};
}
