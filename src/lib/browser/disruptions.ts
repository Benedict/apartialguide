import { disruptionFacts, type TflDisruption } from '../core/adapters/tfl';
import type { Fact } from '../core/facts';
import type { LatLon } from '../core/geo';

const FEED = 'https://api.tfl.gov.uk/Road/all/Disruption?stripContent=true';
/** How long the roads' disruptions are kept before TfL is asked again: ten minutes. */
const KEEP_MS = 10 * 60 * 1000;

let kept: { at: number; disruptions: TflDisruption[] } | undefined;

/**
 * Works and closures on the roads near a place, from TfL, asked from the reader's browser for the
 * map's own place. The whole of London's list is asked once and kept a while, so walking on does not
 * ask again. Nothing at all when there is no answer in time.
 */
export async function fetchDisruptions(
	at: LatLon,
	get: (url: string) => Promise<Response> = (url) => fetch(url),
	timeoutMs = 6000,
	now = Date.now()
): Promise<Fact[] | undefined> {
	try {
		if (!kept || now - kept.at > KEEP_MS) {
			const late = new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('no answer in time')), timeoutMs)
			);
			const res = await Promise.race([get(FEED), late]);
			if (!res.ok) throw new Error(`TfL answered ${res.status}`);
			const disruptions = (await Promise.race([res.json(), late])) as TflDisruption[];
			kept = { at: now, disruptions: Array.isArray(disruptions) ? disruptions : [] };
		}
		return disruptionFacts(kept.disruptions, at, new Date(now).toISOString());
	} catch {
		return undefined;
	}
}
