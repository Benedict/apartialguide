/**
 * Counts the named rivers the map runs under London's ground, borough by borough, from the
 * waterways and borough edges osmium exported as GeoJSON (the River count workflow):
 * RIVERS_WATER, RIVERS_EDGES, RIVERS_DATE; the page written to RIVERS_REPORT and printed.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { boundariesFrom, riverCount, riverReport, waterwaysFrom } from '../src/lib/server/rivers';

const water = process.env.RIVERS_WATER ?? 'water.geojsonseq';
const edges = process.env.RIVERS_EDGES ?? 'edges.geojsonseq';
const out = process.env.RIVERS_REPORT ?? 'build/rivers/london.md';
const asOf = process.env.RIVERS_DATE ?? new Date().toISOString().slice(0, 10);

const ways = waterwaysFrom(readFileSync(water, 'utf8'));
const boroughs = boundariesFrom(readFileSync(edges, 'utf8'));
console.error(`${ways.length} waterways, ${boroughs.length} boroughs`);
const report = riverReport(riverCount(ways, boroughs), asOf);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, report);
console.log(report);
