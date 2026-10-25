import { arrivalFacts, type TflArrival } from '../core/adapters/tfl';
import type { TransitStop } from '../core/adventure/world';
import type { Fact } from '../core/facts';

const TFL = 'https://api.tfl.gov.uk';

/**
 * A stop's predicted arrivals, from TfL, asked from the reader's browser as they arrive. An empty
 * list when TfL says nothing is due; nothing at all when there is no answer in time.
 */
export async function fetchArrivals(
	stop: TransitStop,
	get: (url: string) => Promise<Response> = (url) => fetch(url),
	timeoutMs = 4000
): Promise<Fact[] | undefined> {
	const late = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('no answer in time')), timeoutMs)
	);
	const ask = async (url: string) => {
		const res = await Promise.race([get(url), late]);
		if (!res.ok) throw new Error(`TfL answered ${res.status}`);
		return Promise.race([res.json(), late]);
	};
	try {
		let id = stop.naptan;
		if (!id) {
			// The map names a tram stop but gives no code: TfL finds it by that name.
			const found = await ask(
				`${TFL}/StopPoint/Search/${encodeURIComponent(stop.name)}?modes=${stop.kind}`
			);
			id = found?.matches?.[0]?.id;
			if (!id) return undefined;
		}
		const arrivals = (await ask(`${TFL}/StopPoint/${id}/Arrivals`)) as TflArrival[];
		return arrivalFacts(arrivals, stop.name, new Date().toISOString());
	} catch {
		return undefined;
	}
}
