import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadHistory, readConfig } from './narrator';

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
			historyDir: undefined
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
