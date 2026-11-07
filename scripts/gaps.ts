/**
 * Where the walk ends, by what the map has there (`deadEnds`): run by hand on a snapshot,
 *   SNAPSHOT_PATH=… npm run gaps
 * A kind the walk should cross but does not (a square or a tram platform drawn as an area, still
 * met by a path that ends at its edge) fails it; every other kind is listed, most first, with a
 * place of each, to be looked at when a new one appears.
 */
import { deadEnds } from '../src/lib/core/gaps';
import { OsmIndex, type OsmData } from '../src/lib/core/osm';
import { readJson } from '../src/lib/server/json';
import { loadNarrator, readConfig } from '../src/lib/server/narrator';

const config = readConfig();
if (!config) throw new Error('Set SNAPSHOT_PATH to the snapshot to look at.');
const data = readJson<OsmData>(config.snapshotPath);
const ends = deadEnds(new OsmIndex(data), loadNarrator(config, data).graph);
const kinds = [...ends].sort((a, b) => b[1].length - a[1].length);
for (const [kind, stops] of kinds)
	console.log(`${String(stops.length).padStart(6)}  ${kind}  (${stops[0]})`);
const uncrossed = kinds.filter(
	([kind]) => /highway=(pedestrian|footway) area=yes/.test(kind) || /platform.*tram=yes/.test(kind)
);
if (uncrossed.length) {
	console.error(`\nPaths still end at a square or tram platform drawn as an area:`);
	for (const [kind, stops] of uncrossed) console.error(`  ${kind}: ${stops.join(', ')}`);
	process.exit(1);
}
