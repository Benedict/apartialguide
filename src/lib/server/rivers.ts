import { distance, insideRing, type LatLon } from '../core/geo';

/** A stretch of a waterway as the map draws it: its name if any, whether it runs under the ground. */
export interface Waterway {
	name?: string;
	tunnel: boolean;
	line: LatLon[];
}

/** A borough as the map draws its edge. */
export interface Boundary {
	name: string;
	rings: LatLon[][];
}

/** A named river in one borough: metres of it under the ground and in the open. */
export interface RiverRow {
	name: string;
	borough: string;
	under: number;
	open: number;
}

const OUTSIDE = '(outside the boroughs)';

/** Each named river's metres under the ground and in the open, by the borough each piece lies in. */
export function riverCount(ways: readonly Waterway[], boroughs: readonly Boundary[]): RiverRow[] {
	const rows = new Map<string, RiverRow>();
	for (const way of ways) {
		if (!way.name) continue;
		for (let i = 1; i < way.line.length; i++) {
			const [a, b] = [way.line[i - 1], way.line[i]];
			const middle: LatLon = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
			const borough =
				boroughs.find((x) => x.rings.some((ring) => insideRing(middle, ring)))?.name ?? OUTSIDE;
			const key = `${borough}|${way.name}`;
			const row = rows.get(key) ?? { name: way.name, borough, under: 0, open: 0 };
			row[way.tunnel ? 'under' : 'open'] += distance(a, b);
			rows.set(key, row);
		}
	}
	return [...rows.values()];
}

const metres = (m: number) => `${Math.round(m).toLocaleString('en-GB')} m`;

/** The count as a page: each borough by how much named river runs under it, then London's rivers. */
export function riverReport(rows: readonly RiverRow[], asOf: string): string {
	const buried = rows.filter((r) => r.under >= 1);
	const boroughs = [...new Set(buried.map((r) => r.borough))]
		.map((borough) => {
			const its = buried.filter((r) => r.borough === borough).sort((a, b) => b.under - a.under);
			return { borough, its, under: its.reduce((m, r) => m + r.under, 0) };
		})
		.sort((a, b) => b.under - a.under);
	const rivers = [...new Set(buried.map((r) => r.name))]
		.map((name) => {
			const its = rows.filter((r) => r.name === name);
			return {
				name,
				under: its.reduce((m, r) => m + r.under, 0),
				open: its.reduce((m, r) => m + r.open, 0),
				boroughs: [...new Set(its.map((r) => r.borough))]
			};
		})
		.sort((a, b) => b.under - a.under);
	return [
		'# Named rivers under London',
		'',
		`As the map drew them on ${asOf}: named waterways the map runs in a culvert or tunnel, by borough. Unnamed ones are left out.`,
		'',
		'| Borough | Buried rivers | Under the ground | Rivers |',
		'|---|---|---|---|',
		...boroughs.map(
			(b) =>
				`| ${b.borough} | ${b.its.length} | ${metres(b.under)} | ${b.its
					.map((r) => `${r.name} (${metres(r.under)})`)
					.join(', ')} |`
		),
		'',
		'## Each river, across London',
		'',
		'| River | Under the ground | In the open | Boroughs |',
		'|---|---|---|---|',
		...rivers.map(
			(r) => `| ${r.name} | ${metres(r.under)} | ${metres(r.open)} | ${r.boroughs.join(', ')} |`
		),
		''
	].join('\n');
}

type Position = [number, number];
interface Feature {
	geometry: { type: string; coordinates: unknown };
	properties: Record<string, string>;
}

const RECORD_SEPARATOR = String.fromCharCode(0x1e);

/** Each feature of GeoJSON written one a line (osmium's `geojsonseq`, each line led by a record separator). */
const featuresOf = (text: string): Feature[] =>
	text
		.split('\n')
		.map((l) => (l.startsWith(RECORD_SEPARATOR) ? l.slice(1) : l).trim())
		.filter(Boolean)
		.map((l) => JSON.parse(l) as Feature);

const latLon = ([lon, lat]: Position): LatLon => [lat, lon];

/** The waterways drawn as lines, each with its name, and whether it runs in a culvert or tunnel. */
export function waterwaysFrom(text: string): Waterway[] {
	return featuresOf(text).flatMap(({ geometry, properties }) => {
		const lines =
			geometry.type === 'LineString'
				? [geometry.coordinates as Position[]]
				: geometry.type === 'MultiLineString'
					? (geometry.coordinates as Position[][])
					: [];
		const tunnel = !!properties.tunnel && properties.tunnel !== 'no';
		return lines.map((l) => ({
			...(properties.name ? { name: properties.name } : {}),
			tunnel,
			line: l.map(latLon)
		}));
	});
}

/** The boroughs drawn as areas, each with its outer rings. */
export function boundariesFrom(text: string): Boundary[] {
	return featuresOf(text).flatMap(({ geometry, properties }) => {
		const polygons =
			geometry.type === 'Polygon'
				? [geometry.coordinates as Position[][]]
				: geometry.type === 'MultiPolygon'
					? (geometry.coordinates as Position[][][])
					: [];
		return properties.name && polygons.length
			? [{ name: properties.name, rings: polygons.map((p) => p[0].map(latLon)) }]
			: [];
	});
}
