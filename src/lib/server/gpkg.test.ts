import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fromNationalGrid, gpkgGeometry, readGpkgLayer } from './gpkg';

// GeoPackage geometry: "GP", version 0, flags (little-endian, envelope kind), srs id, envelope, WKB.
function blob(wkb: number[], envelope = 0): Uint8Array {
	const head = Buffer.alloc(8);
	head.write('GP', 0, 'ascii');
	head[2] = 0;
	head[3] = 1 | (envelope << 1);
	head.writeInt32LE(27700, 4);
	const env = Buffer.alloc(envelope === 1 ? 32 : 0);
	return new Uint8Array(Buffer.concat([head, env, Buffer.from(wkb)]));
}
const le = (type: number, ...doubles: number[]) => {
	const b = Buffer.alloc(5 + doubles.length * 8);
	b[0] = 1;
	b.writeUInt32LE(type, 1);
	doubles.forEach((d, i) => b.writeDoubleLE(d, 5 + i * 8));
	return [...b];
};
const u32 = (n: number) => {
	const b = Buffer.alloc(4);
	b.writeUInt32LE(n);
	return [...b];
};
const f64 = (...ds: number[]) =>
	ds.flatMap((d) => {
		const b = Buffer.alloc(8);
		b.writeDoubleLE(d);
		return [...b];
	});

describe('gpkgGeometry (a GeoPackage geometry, as GeoJSON)', () => {
	it('reads a point, past an envelope', () => {
		expect(gpkgGeometry(blob(le(1, 530000, 165000), 1))).toEqual({
			type: 'Point',
			coordinates: [530000, 165000]
		});
	});
	it('reads a multi-line, each part its own WKB', () => {
		const part = (pts: number[][]) => [1, ...u32(2), ...u32(pts.length), ...f64(...pts.flat())];
		const wkb = [
			1,
			...u32(5),
			...u32(2),
			...part([
				[1, 2],
				[3, 4]
			]),
			...part([
				[5, 6],
				[7, 8]
			])
		];
		expect(gpkgGeometry(blob(wkb))).toEqual({
			type: 'MultiLineString',
			coordinates: [
				[
					[1, 2],
					[3, 4]
				],
				[
					[5, 6],
					[7, 8]
				]
			]
		});
	});
	it('reads a polygon, dropping a third dimension', () => {
		const wkb = [1, ...u32(1003), ...u32(1), ...u32(2), ...f64(1, 2, 9, 3, 4, 9)];
		expect(gpkgGeometry(blob(wkb))).toEqual({
			type: 'Polygon',
			coordinates: [
				[
					[1, 2],
					[3, 4]
				]
			]
		});
	});
	it('says nothing of a blob that is not a GeoPackage geometry', () => {
		expect(gpkgGeometry(new Uint8Array([0, 1, 2]))).toBeUndefined();
	});
});

describe('fromNationalGrid (British National Grid to longitude and latitude)', () => {
	it('puts the Ordnance Survey’s worked example where it lies, within a few hundred metres', () => {
		const [lon, lat] = fromNationalGrid([651409.903, 313177.27]);
		expect(lat).toBeCloseTo(52.6576, 2);
		expect(lon).toBeCloseTo(1.7179, 2);
	});
});

describe('readGpkgLayer (one table of a GeoPackage, as a GeoJSON layer)', () => {
	it('gives each row’s fields as properties and its geometry in longitude and latitude', () => {
		const path = join(mkdtempSync(join(tmpdir(), 'gpkg-')), 'invented.gpkg');
		const db = new DatabaseSync(path);
		db.exec('CREATE TABLE "Invented Sites" (fid INTEGER PRIMARY KEY, geom BLOB, "Site name" TEXT)');
		db.prepare('INSERT INTO "Invented Sites" (geom, "Site name") VALUES (?, ?)').run(
			blob(le(1, 651409.903, 313177.27)),
			'Inventon'
		);
		db.close();
		const layer = readGpkgLayer(path, 'Invented Sites');
		expect(layer.features).toHaveLength(1);
		const [f] = layer.features;
		expect(f.properties).toEqual({ 'Site name': 'Inventon' });
		const [lon, lat] = f.geometry!.coordinates as number[];
		expect(lat).toBeCloseTo(52.6576, 2);
		expect(lon).toBeCloseTo(1.7179, 2);
	});
});
