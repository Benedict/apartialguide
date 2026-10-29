import { describe, expect, it } from 'vitest';
import type { Fact } from '../facts';
import { cameraLines, flightsLine, planetsLine, satellitesLine } from './overhead';

const f = (subject: string, key: string, value: string | number): Fact => ({
	id: `${subject}:${key}`,
	subject,
	claim: { key, value: String(value) },
	source: 'Invented',
	observed: '2026-10-29T19:39:35Z',
	reach: 0,
	geometry: []
});

describe('planetsLine', () => {
	it('says where each planet above the horizon stands', () => {
		expect(
			planetsLine([
				f('planet/Saturn', 'name', 'Saturn'),
				f('planet/Saturn', 'altitude', 31.4),
				f('planet/Saturn', 'azimuth', 136),
				f('planet/Venus', 'name', 'Venus'),
				f('planet/Venus', 'altitude', 8),
				f('planet/Venus', 'azimuth', 250)
			])
		).toBe('Saturn is up in the south-east, and Venus low in the west.');
		expect(planetsLine([])).toBeUndefined();
	});
});

describe('satellitesLine', () => {
	it('names what passes above the roofs as it is published, how high and where', () => {
		expect(
			satellitesLine([
				f('satellite/1', 'name', 'INVENTED SAT'),
				f('satellite/1', 'elevation', 62),
				f('satellite/1', 'azimuth', 225),
				f('satellite/1', 'height', 418)
			])
		).toBe('Above the roofs, “INVENTED SAT” passes, 418 km up, high in the south-west.');
	});

	it('tells three at most', () => {
		const many = [1, 2, 3, 4].flatMap((n) => [
			f(`satellite/${n}`, 'name', `SAT ${n}`),
			f(`satellite/${n}`, 'elevation', 20),
			f(`satellite/${n}`, 'azimuth', 0),
			f(`satellite/${n}`, 'height', 800)
		]);
		expect(satellitesLine(many)).toBe(
			'Above the roofs pass “SAT 1”, 800 km up, up in the north; “SAT 2”, 800 km up, up in the north; and “SAT 3”, 800 km up, up in the north.'
		);
	});
});

describe('flightsLine', () => {
	it('gives each aircraft by its call sign, its height in feet and its heading', () => {
		expect(
			flightsLine([
				f('flight/a', 'callsign', 'INV123'),
				f('flight/a', 'altitude', 17900),
				f('flight/a', 'track', 324)
			])
		).toBe('Overhead, INV123 at 17,900 feet, heading north-west.');
		expect(flightsLine([])).toBeUndefined();
	});
});

describe('cameraLines', () => {
	const camera = [
		f('camera/1', 'name', 'Invented Rd/Other Rd'),
		f('camera/1', 'image', 'https://example.org/cam.jpg'),
		f('camera/1', 'latitude', 51.5),
		f('camera/1', 'longitude', -0.09),
		f('camera/1', 'taken', '2026-10-29T19:35:26Z')
	];

	it('says where the nearest camera is from here, and when it last looked', () => {
		expect(cameraLines(camera, [51.5, -0.1])).toEqual({
			lines: [
				'The nearest camera is at “Invented Rd/Other Rd”, 690 metres to the east. This is what it saw at 19:35.'
			],
			image: {
				src: 'https://example.org/cam.jpg',
				alt: 'What the camera at Invented Rd/Other Rd saw'
			}
		});
	});

	it('leaves out when, if the camera does not say', () => {
		expect(cameraLines(camera.slice(0, 4), [51.5, -0.1]).lines[0]).toBe(
			'The nearest camera is at “Invented Rd/Other Rd”, 690 metres to the east. This is what it saw.'
		);
	});

	it('says so when no camera watches near here', () => {
		expect(cameraLines([], [51.5, -0.1])).toEqual({ lines: ['No camera watches near here.'] });
	});
});
