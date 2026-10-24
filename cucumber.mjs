import { existsSync, readdirSync } from 'node:fs';

// Scenarios tagged @snapshot read the real OSM snapshot. Until it has been fetched
// (npm run snapshot), they are left out and a warning says so.
const snapshot = `${process.env.SNAPSHOT_DIR ?? 'data/snapshots'}/addiscombe-2026-10-24.json`;
const haveSnapshot = existsSync(snapshot);
if (!haveSnapshot) console.warn(`\n⚠ ${snapshot} not found: skipping @snapshot scenarios.\n`);
// Scenarios tagged @history also need the past maps the History workflow fetches.
const historyDir = process.env.HISTORY_DIR ?? 'data/history';
const haveHistory =
	existsSync(historyDir) && readdirSync(historyDir).some((f) => f.endsWith('.json'));
if (!haveHistory) console.warn(`\n⚠ no past maps in ${historyDir}: skipping @history scenarios.\n`);

export default {
	paths: ['features/**/*.feature'],
	import: ['features/support/**/*.ts', 'features/steps/**/*.ts'],
	tags: [
		'not @icebox',
		'not @later',
		...(haveSnapshot ? [] : ['not @snapshot']),
		...(haveHistory ? [] : ['not @history'])
	].join(' and '),
	format: ['progress'],
	strict: true
};
