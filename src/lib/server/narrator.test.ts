import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadHistory, loadLatest, loadRecords, readConfig } from './narrator';

describe('readConfig', () => {
	it('is undefined without a snapshot', () => {
		expect(readConfig({})).toBeUndefined();
	});

	it('takes the date from the snapshot file name', () => {
		expect(readConfig({ SNAPSHOT_PATH: 'data/snapshots/addiscombe-2026-10-24.json' })).toEqual({
			snapshotPath: 'data/snapshots/addiscombe-2026-10-24.json',
			snapshotDate: '2026-10-24',
			spacing: 50,
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

	it('uses every source when use.env leaves none out, or is missing', () => {
		const dir = mkdtempSync(join(tmpdir(), 'records-'));
		writeFileSync(join(dir, 'bench-2026-10-25.json'), store('bench'));
		expect(loadRecords(dir).map((s) => s.prefix)).toEqual(['bench']);
		writeFileSync(join(dir, 'use.env'), 'LEAVE_OUT=\n');
		expect(loadRecords(dir).map((s) => s.prefix)).toEqual(['bench']);
	});
});
