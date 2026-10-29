import type { Fact } from '../facts';

/** One camera, as TfL's Place search answers. */
export interface JamCam {
	id: string;
	commonName?: string;
	distance?: number;
	lat?: number;
	lon?: number;
	additionalProperties?: { key: string; value: string }[];
}

const property = (camera: JamCam, key: string) =>
	camera.additionalProperties?.find((p) => p.key === key)?.value;

/** The nearest camera TfL says is working, of those it found. */
export function nearestCamera(cameras: readonly JamCam[]): JamCam | undefined {
	return cameras
		.filter((c) => property(c, 'available') === 'true' && property(c, 'imageUrl') && c.commonName)
		.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];
}

/** A camera as facts: its name and place as TfL gives them, its picture, and when it was taken. */
export function cameraFacts(camera: JamCam, taken: string | undefined, observed: string): Fact[] {
	const subject = `camera/${camera.id}`;
	const claims: [string, string | number | undefined][] = [
		['name', camera.commonName],
		['image', property(camera, 'imageUrl')],
		['latitude', camera.lat],
		['longitude', camera.lon],
		['taken', taken]
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
}
