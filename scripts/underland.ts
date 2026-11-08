/**
 * Writes Underland's records for the walk (RECORDS_DIR) from the newest dated files Underground's
 * fetchers wrote (UNDERGROUND_DATA, default ../apartialguide-underground/data): the mines' plans of
 * the ground itself and their returns as zones over that ground, the rocks beneath as zones, and
 * boreholes standing alone. Kept private, in the data repository, until BGS confirms its licence:
 *   RECORDS_DIR=../apartialguide-data/records/underland npm run underland
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	boreholeRecords,
	mineZones,
	returnZones,
	rockZones,
	type BeneathStore,
	type LedgerStore,
	type MarkStore,
	type PlanStore
} from '../src/lib/server/sources/underland';

const from = process.env.UNDERGROUND_DATA ?? '../apartialguide-underground/data';
const to = process.env.RECORDS_DIR;
if (!to) throw new Error('Set RECORDS_DIR to where the walk should read these records from.');

function newest<T>(dir: string): T {
	const file = readdirSync(join(from, dir))
		.filter((f) => f.endsWith('.json'))
		.sort()
		.at(-1);
	if (!file) throw new Error(`Nothing in ${join(from, dir)} yet.`);
	return JSON.parse(readFileSync(join(from, dir, file), 'utf8')) as T;
}

const plans = newest<PlanStore>('plans');
const beneath = newest<BeneathStore>('beneath');
const ledger = newest<LedgerStore>('ledger');
const marks = newest<MarkStore>('marks');
// The two BGS sources, named apart so each is credited for what it gave.
const sources = {
	boreholes: 'British Geological Survey, Single Onshore Borehole Index',
	rocks: 'British Geological Survey, BGS Geology 625k'
};
const mines = mineZones(plans);
const stores = [
	mines,
	returnZones(ledger, mines, marks),
	boreholeRecords({ ...beneath, source: sources.boreholes }),
	rockZones({ ...beneath, source: sources.rocks })
];
mkdirSync(to, { recursive: true });
for (const store of stores) {
	const path = join(to, `${store.prefix}-${store.retrieved}.json`);
	writeFileSync(path, JSON.stringify(store) + '\n');
	console.log(
		`${path}: ${store.records.length} records, ${store.areas?.length ?? 0} zones (${store.source})`
	);
}
