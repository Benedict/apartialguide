import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { readJson, writeJson } from './json';

const dir = () => mkdtempSync(join(tmpdir(), 'json-'));
const map = { bbox: '0,0,1,1', elements: [{ type: 'node', id: 1, lat: 0.5, lon: 0.5 }] };

describe('JSON on disk', () => {
	it('writes and reads plain JSON', () => {
		const path = join(dir(), 'a-2026-01-01.json');
		writeJson(path, map);
		expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(map);
		expect(readJson(path)).toEqual(map);
	});

	it('writes a .json.gz gzipped, and reads it back the same', () => {
		const path = join(dir(), 'a-2026-01-01.json.gz');
		writeJson(path, map);
		expect(JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'))).toEqual(map);
		expect(readJson(path)).toEqual(map);
	});

	it('writes a map element by element, much smaller gzipped', () => {
		const many = { bbox: '0,0,1,1', elements: Array.from({ length: 5000 }, (_, id) => ({ id })) };
		const path = join(dir(), 'big-2026-01-01.json.gz');
		writeJson(path, many);
		expect(statSync(path).size).toBeLessThan(JSON.stringify(many).length);
		expect(readJson(path)).toEqual(many);
	});
});
