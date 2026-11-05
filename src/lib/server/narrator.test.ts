import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SyntheticMap } from '../core/testing/synthetic';
import { writeJson } from './json';
import { loadHistory, loadLatest, loadNarrator, loadRecords, readConfig } from './narrator';

describe('loadNarrator', () => {
	it('reads a snapshot kept gzipped, as a whole borough is', () => {
		const map = new SyntheticMap();
		const a = map.node(SyntheticMap.ORIGIN);
		map.way([a, map.nodeFrom(SyntheticMap.ORIGIN, 90, 200)], {
			highway: 'residential',
			name: 'Inventa Road'
		});
		const path = join(mkdtempSync(join(tmpdir(), 'snap-')), 'testtown-2026-01-01.json.gz');
		writeJson(path, { bbox: '0,0,1,1', ...map.toData() });
		const narrator = loadNarrator(readConfig({ SNAPSHOT_PATH: path })!);
		expect(narrator.graph.all().length).toBeGreaterThan(1);
	});
});

describe('readConfig', () => {
	it('is undefined without a snapshot', () => {
		expect(readConfig({})).toBeUndefined();
	});

	it('takes the date from the snapshot file name', () => {
		expect(readConfig({ SNAPSHOT_PATH: 'data/snapshots/addiscombe-2026-10-24.json' })).toEqual({
			snapshotPath: 'data/snapshots/addiscombe-2026-10-24.json',
			snapshotDate: '2026-10-24',
			spacing: 150,
			start: undefined,
			narrationPath: undefined,
			historyDir: undefined,
			wikidataDir: undefined
		});
	});

	it('reads spacing and a start point', () => {
		const config = readConfig({
			SNAPSHOT_PATH: 'x.json',
			SNAPSHOT_DATE: '2026-01-01',
			STOP_SPACING_M: '40',
			START_AT: '51.38,-0.07'
		});
		expect(config).toMatchObject({ spacing: 40, start: [51.38, -0.07] });
	});

	it('reads where prose written ahead of time is kept', () => {
		const config = readConfig({ SNAPSHOT_PATH: 'x-2026-01-01.json', NARRATION_PATH: 'n.json' });
		expect(config?.narrationPath).toBe('n.json');
	});

	it('reads where Wikidata is kept', () => {
		const config = readConfig({
			SNAPSHOT_PATH: 'x-2026-01-01.json',
			WIKIDATA_DIR: 'data/wikidata'
		});
		expect(config).toMatchObject({ wikidataDir: 'data/wikidata' });
	});

	it('refuses a snapshot with no date', () => {
		expect(() => readConfig({ SNAPSHOT_PATH: 'x.json' })).toThrow(/SNAPSHOT_DATE/);
	});
});

describe('loadHistory', () => {
	it('reads every past map in the directory, dated by its asOf, oldest first', () => {
		const dir = mkdtempSync(join(tmpdir(), 'history-'));
		writeFileSync(
			join(dir, 'addiscombe-2017-01-01.json'),
			JSON.stringify({ asOf: '2017-01-01', elements: [] })
		);
		writeFileSync(
			join(dir, 'addiscombe-2013-01-01.json'),
			JSON.stringify({ asOf: '2013-01-01', elements: [] })
		);
		writeFileSync(join(dir, 'request.env'), 'AS_OF=2013-01-01');
		expect(loadHistory(dir).map((h) => h.asOf)).toEqual(['2013-01-01', '2017-01-01']);
	});

	it('is empty without a directory', () => {
		expect(loadHistory(undefined)).toEqual([]);
		expect(loadHistory(join(tmpdir(), 'no-such-history'))).toEqual([]);
	});
});

describe('loadLatest', () => {
	it('reads the newest dated file in the directory', () => {
		const dir = mkdtempSync(join(tmpdir(), 'latest-'));
		writeFileSync(join(dir, 'addiscombe-2026-10-25.json'), JSON.stringify({ n: 2 }));
		writeFileSync(join(dir, 'addiscombe-2026-01-01.json'), JSON.stringify({ n: 1 }));
		writeFileSync(join(dir, 'request.env'), 'X=1');
		expect(loadLatest(dir)).toEqual({ n: 2 });
	});

	it('is nothing without a directory or a file', () => {
		expect(loadLatest(undefined)).toBeUndefined();
		expect(loadLatest(mkdtempSync(join(tmpdir(), 'empty-')))).toBeUndefined();
	});
});

describe('loadRecords', () => {
	const store = (prefix: string) =>
		JSON.stringify({ source: 'Invented', prefix, retrieved: '2026-10-25', records: [] });

	it('reads the newest store of each source, leaving out those use.env names', () => {
		const dir = mkdtempSync(join(tmpdir(), 'records-'));
		writeFileSync(join(dir, 'bench-2026-10-25.json'), store('bench'));
		writeFileSync(join(dir, 'wildlife-2026-10-25.json'), store('wildlife'));
		writeFileSync(join(dir, 'postcode-2026-10-25.json'), store('postcode'));
		writeFileSync(
			join(dir, 'use.env'),
			'# Sources to leave out of the walk\nLEAVE_OUT=wildlife, postcode\n'
		);
		expect(loadRecords(dir).map((s) => s.prefix)).toEqual(['bench']);
	});

	it('leaves out each record withheld.json names, by its id or its address, in that source alone', () => {
		const dir = mkdtempSync(join(tmpdir(), 'records-'));
		const records = (prefix: string) =>
			JSON.stringify({
				source: 'Invented',
				prefix,
				retrieved: '2026-10-25',
				records: [
					{ id: 'r1', address: { number: '12', street: 'INVENTED ROAD' }, claims: {} },
					{ id: 'r2', address: { number: '14', street: 'Invented Road' }, claims: {} },
					{ id: 'r3', claims: {} }
				]
			});
		writeFileSync(join(dir, 'price-2026-10-25.json'), records('price'));
		writeFileSync(join(dir, 'bench-2026-10-25.json'), records('bench'));
		writeFileSync(
			join(dir, 'withheld.json'),
			JSON.stringify({
				withheld: [
					{ source: 'price', number: '12', street: 'Invented Road', asked: '2026-11-05' },
					{ source: 'price', id: 'r3', asked: '2026-11-05' }
				]
			})
		);
		const ids = (prefix: string) =>
			loadRecords(dir)
				.find((s) => s.prefix === prefix)!
				.records.map((r) => r.id);
		expect(ids('price')).toEqual(['r2']);
		expect(ids('bench')).toEqual(['r1', 'r2', 'r3']);
	});

	it('uses every source when use.env leaves none out, or is missing', () => {
		const dir = mkdtempSync(join(tmpdir(), 'records-'));
		writeFileSync(join(dir, 'bench-2026-10-25.json'), store('bench'));
		expect(loadRecords(dir).map((s) => s.prefix)).toEqual(['bench']);
		writeFileSync(join(dir, 'use.env'), 'LEAVE_OUT=\n');
		expect(loadRecords(dir).map((s) => s.prefix)).toEqual(['bench']);
	});

	// Invented records: an area's files are named <prefix>.<area>-<date>.json.
	const kept = (prefix: string, retrieved: string, ids: string[]) =>
		JSON.stringify({
			source: 'Invented',
			prefix,
			retrieved,
			records: ids.map((id) => ({ id, at: [51, 0], observed: retrieved, claims: { name: id } }))
		});

	it('joins each area’s records of a source into one store, each record once, the newest copy kept', () => {
		const dir = mkdtempSync(join(tmpdir(), 'records-'));
		writeFileSync(join(dir, 'hygiene-2026-10-25.json'), kept('hygiene', '2026-10-25', ['a', 'b']));
		writeFileSync(
			join(dir, 'hygiene.inventa-2026-11-01.json'),
			kept('hygiene', '2026-11-01', ['b', 'c'])
		);
		const stores = loadRecords(dir);
		expect(stores.map((s) => s.prefix)).toEqual(['hygiene']);
		expect(stores[0].records.map((r) => [r.id, r.observed])).toEqual([
			['a', '2026-10-25'],
			['b', '2026-11-01'],
			['c', '2026-11-01']
		]);
	});

	it('leaves out an area’s records of a source use.env names', () => {
		const dir = mkdtempSync(join(tmpdir(), 'records-'));
		writeFileSync(join(dir, 'bench-2026-10-25.json'), store('bench'));
		writeFileSync(join(dir, 'wildlife.inventa-2026-11-01.json'), store('wildlife'));
		writeFileSync(join(dir, 'use.env'), 'LEAVE_OUT=wildlife\n');
		expect(loadRecords(dir).map((s) => s.prefix)).toEqual(['bench']);
	});
});
