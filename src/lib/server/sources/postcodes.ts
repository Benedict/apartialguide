import type { SourceRecord } from '../../core/adapters/records';
import { inBox } from './box';

interface PostcodeFeature {
	properties?: Record<string, unknown>;
	geometry?: { coordinates?: number[] } | null;
}

/** A property by name, whatever its case: the directory's fields come in either. */
const field = (props: Record<string, unknown>, name: string) =>
	Object.entries(props).find(([k]) => k.toLowerCase() === name)?.[1];

/** "199806" as "1998-06". */
const month = (v: unknown) => {
	const s = String(v ?? '').replace(/\D/g, '');
	return s.length >= 6 ? `${s.slice(0, 4)}-${s.slice(4, 6)}` : undefined;
};

/**
 * Postcodes from the ONS Postcode Directory that have ended: each where its centre was, called by
 * the postcode, with the months it began and ended as the directory gives them.
 */
export function postcodeRecords(
	answer: { features?: PostcodeFeature[] },
	box: string
): SourceRecord[] {
	return (answer.features ?? []).flatMap((f) => {
		const props = f.properties ?? {};
		const name = String(field(props, 'pcds') ?? '').trim();
		const ended = month(field(props, 'doterm'));
		const began = month(field(props, 'dointr'));
		const [lon, lat] = f.geometry?.coordinates ?? [];
		if (!name || !ended || typeof lat !== 'number' || typeof lon !== 'number') return [];
		if (!inBox([lat, lon], box)) return [];
		return [
			{
				id: name,
				at: [lat, lon] as [number, number],
				observed: `${ended}-01`,
				claims: { name, kind: 'postcode', ...(began ? { began } : {}), ended }
			}
		];
	});
}
