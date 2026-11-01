import { DatabaseSync } from 'node:sqlite';
import proj4 from 'proj4';

/**
 * A GeoPackage read by hand: its tables' rows as GeoJSON features, their geometries taken from
 * British National Grid to longitude and latitude. For layers kept as a GeoPackage, such as Digital
 * Britannia's, read from a file downloaded by hand.
 */

export type Geometry = { type: string; coordinates: unknown };
export interface Layer {
	features: { properties: Record<string, unknown>; geometry: Geometry | null }[];
}

/** EPSG:27700, with the seven-parameter shift from OSGB36: right to a few metres. */
const BNG =
	'+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy ' +
	'+towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs';
const toWgs84 = proj4(BNG, 'WGS84');

/** An easting and northing as longitude and latitude. */
export const fromNationalGrid = ([e, n]: number[]): [number, number] =>
	toWgs84.forward([e, n]) as [number, number];

const TYPES = [
	'',
	'Point',
	'LineString',
	'Polygon',
	'MultiPoint',
	'MultiLineString',
	'MultiPolygon'
];
/** How many bytes of envelope each value of the flags' envelope bits carries. */
const ENVELOPE = [0, 32, 48, 48, 64];

/** A GeoPackage geometry blob as GeoJSON, in its own coordinates, two dimensions kept. */
export function gpkgGeometry(bytes: Uint8Array): Geometry | undefined {
	if (bytes.length < 8 || bytes[0] !== 0x47 || bytes[1] !== 0x50) return undefined;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const flags = bytes[3];
	if (flags & 0x10) return undefined; // empty
	let at = 8 + (ENVELOPE[(flags >> 1) & 7] ?? 0);
	const read = (): Geometry => {
		const little = bytes[at] === 1;
		const raw = view.getUint32(at + 1, little);
		at += 5;
		// ISO WKB adds 1000 for Z, 2000 for M, 3000 for both; EWKB sets high bits instead.
		const iso = raw & 0xffff;
		const kind = iso % 1000;
		const dims =
			2 +
			(Math.floor(iso / 1000) === 3 ? 2 : Math.floor(iso / 1000) ? 1 : 0) +
			(raw & 0x80000000 ? 1 : 0) +
			(raw & 0x40000000 ? 1 : 0);
		const u32 = () => ((at += 4), view.getUint32(at - 4, little));
		const point = () => {
			const p = [view.getFloat64(at, little), view.getFloat64(at + 8, little)];
			at += dims * 8;
			return p;
		};
		const points = () => Array.from({ length: u32() }, point);
		const type = TYPES[kind];
		if (!type) throw new Error(`gpkg: geometry type ${raw} is not read`);
		if (kind === 1) return { type, coordinates: point() };
		if (kind === 2) return { type, coordinates: points() };
		if (kind === 3) return { type, coordinates: Array.from({ length: u32() }, points) };
		return { type, coordinates: Array.from({ length: u32() }, () => read().coordinates) };
	};
	return read();
}

/** Every coordinate of a geometry, taken from British National Grid to longitude and latitude. */
function reproject(g: Geometry): Geometry {
	const walk = (c: unknown): unknown =>
		Array.isArray(c) && typeof c[0] === 'number'
			? fromNationalGrid(c as number[])
			: (c as unknown[]).map(walk);
	return { type: g.type, coordinates: walk(g.coordinates) };
}

/** One table of a GeoPackage in British National Grid, as a GeoJSON layer in longitude and latitude. */
export function readGpkgLayer(path: string, table: string, geometryColumn = 'geom'): Layer {
	const db = new DatabaseSync(path, { readOnly: true });
	try {
		const rows = db.prepare(`SELECT * FROM "${table.replace(/"/g, '""')}"`).all();
		return {
			features: rows.map((row) => {
				const { [geometryColumn]: geom, ...properties } = row as Record<string, unknown>;
				delete properties.fid;
				const g = geom instanceof Uint8Array ? gpkgGeometry(geom) : undefined;
				return { properties, geometry: g ? reproject(g) : null };
			})
		};
	} finally {
		db.close();
	}
}
