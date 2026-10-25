import { describe, expect, it } from 'vitest';
import { moonIllumination, moonPosition, sunPosition } from './astronomy';

// The reference values SunCalc publishes for 5 March 2013, 00:00 UTC, at 50.5° N 30.5° E. SunCalc
// gives azimuth from the south in radians; here it is from the north in degrees.
const date = new Date('2013-03-05T00:00:00Z');
const deg = (rad: number) => (rad * 180) / Math.PI;

describe('astronomy', () => {
	it('places the sun as SunCalc does', () => {
		const sun = sunPosition(date, 50.5, 30.5);
		expect(sun.altitude).toBeCloseTo(deg(-0.7000406838781611), 3);
		expect(sun.azimuth).toBeCloseTo(deg(-2.5003175907168385) + 180, 3);
	});

	it('lights the moon as SunCalc does', () => {
		const moon = moonIllumination(date);
		expect(moon.fraction).toBeCloseTo(0.4848068202456373, 4);
		expect(moon.phase).toBeCloseTo(0.7548368838538762, 4);
	});

	it('places the moon within a degree of where SunCalc does, refraction aside', () => {
		const moon = moonPosition(date, 50.5, 30.5);
		expect(moon.azimuth).toBeCloseTo(deg(-0.9783999522438226) + 180, 0);
		expect(Math.abs(moon.altitude - deg(0.014551482243892251))).toBeLessThan(1);
	});
});
