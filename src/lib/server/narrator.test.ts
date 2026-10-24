import { describe, expect, it } from 'vitest';
import { readConfig } from './narrator';

describe('readConfig', () => {
	it('is undefined without a snapshot', () => {
		expect(readConfig({})).toBeUndefined();
	});

	it('takes the date from the snapshot file name', () => {
		expect(readConfig({ SNAPSHOT_PATH: 'data/snapshots/addiscombe-2026-10-24.json' })).toEqual({
			snapshotPath: 'data/snapshots/addiscombe-2026-10-24.json',
			snapshotDate: '2026-10-24',
			spacing: 50,
			start: undefined
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

	it('refuses a snapshot with no date', () => {
		expect(() => readConfig({ SNAPSHOT_PATH: 'x.json' })).toThrow(/SNAPSHOT_DATE/);
	});
});
