import { cameraFacts, nearestCamera, type JamCam } from '../core/adapters/jamcam';
import type { Omm, Overhead } from '../core/adapters/overhead';
import type { Fact } from '../core/facts';

type Get = (url: string, init?: RequestInit) => Promise<Response>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserGet: Get = (url, init) => fetch(url, init);

/** An answer within the time allowed, or nothing. */
async function answered<T>(ask: () => Promise<T>, timeoutMs: number): Promise<T | undefined> {
	const late = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs));
	try {
		return await Promise.race([ask(), late]);
	} catch {
		return undefined;
	}
}

/** How far around the map's place to look for a camera, in metres. */
const CAMERA_RADIUS = 1500;

/**
 * The camera nearest where the map puts the place, from TfL, asked from the reader's browser: its
 * facts, an empty list when no camera is near, nothing at all without an answer in time.
 */
export function fetchCamera(
	at: Overhead,
	get: Get = browserGet,
	timeoutMs = 5000
): Promise<Fact[] | undefined> {
	return answered(async () => {
		const res = await get(
			`https://api.tfl.gov.uk/Place?type=JamCam&lat=${at.latitude}&lon=${at.longitude}&radius=${CAMERA_RADIUS}`
		);
		if (!res.ok) throw new Error(`TfL answered ${res.status}`);
		const camera = nearestCamera(((await res.json()).places ?? []) as JamCam[]);
		if (!camera) return [];
		const image = camera.additionalProperties!.find((p) => p.key === 'imageUrl')!.value;
		// When the picture was taken is when it was last written; without word of it, Guide leaves it out.
		const head = await get(image, { method: 'HEAD' }).catch(() => undefined);
		const modified = head?.ok ? head.headers.get('Last-Modified') : null;
		const taken = modified ? new Date(modified).toISOString() : undefined;
		return cameraFacts(camera, taken, new Date().toISOString());
	}, timeoutMs);
}

const SATELLITES = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json';
const KEPT = 'a-partial-guide:satellites';
/** CelesTrak asks that its elements be fetched seldom; they are good for days. */
const KEEP_MS = 6 * 60 * 60 * 1000;

const browserStore = (): Store | undefined => {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
};

/** The bright satellites' elements, from CelesTrak, kept in the browser for six hours. */
export async function fetchSatellites(
	get: Get = browserGet,
	store: Store | undefined = browserStore(),
	now = new Date(),
	timeoutMs = 5000
): Promise<Omm[] | undefined> {
	try {
		const kept = JSON.parse(store?.getItem(KEPT) ?? 'null');
		if (kept && now.getTime() - kept.at < KEEP_MS) return kept.elements;
	} catch {
		// Nothing kept, or nothing readable: ask again.
	}
	const elements = await answered(async () => {
		const res = await get(SATELLITES);
		if (!res.ok) throw new Error(`CelesTrak answered ${res.status}`);
		return (await res.json()) as Omm[];
	}, timeoutMs);
	if (elements)
		try {
			store?.setItem(KEPT, JSON.stringify({ at: now.getTime(), elements }));
		} catch {
			// A browser that keeps nothing asks again next time.
		}
	return elements;
}

/** The aircraft near the map's place, from the flights function the page was built with, if any. */
export function fetchFlights(url: string | undefined, get: Get = browserGet, timeoutMs = 4000) {
	if (!url) return Promise.resolve(undefined);
	return answered(async () => {
		const res = await get(url);
		if (!res.ok) throw new Error(`flights answered ${res.status}`);
		return (await res.json()) as { ac?: unknown[] };
	}, timeoutMs);
}
