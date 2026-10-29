/**
 * Writes out the prompts for the next stops to narrate, nearest START_AT first, for prose written
 * in a Claude Code session rather than through the API. The same path as `npm run narrate`, with a
 * model that only records what it is asked. Then write the prose into PROSE_FROM (a JSON object of
 * key to prose) and run `PROSE_FROM=… npm run narrate`, which puts it through the same guards.
 *   SNAPSHOT_PATH=… START_AT=… NARRATE_LIMIT=25 npm run narrate:prompts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isBusier } from '../src/lib/core/busier';
import { narrateWorld } from '../src/lib/core/narration';
import type { Prompt } from '../src/lib/core/render/prompt';
import { loadNarration, loadNarrator, readConfig, startStop } from '../src/lib/server/narrator';

const config = readConfig();
if (!config) {
	console.error('Set SNAPSHOT_PATH to the snapshot to narrate');
	process.exit(1);
}
const store = loadNarration(config.narrationPath ?? 'data/narration/addiscombe.json');
const narrator = loadNarrator(config);
const asked: { stop: string; key: string; prompt: Prompt }[] = [];
await narrateWorld(
	narrator,
	{
		name: 'prompts',
		async write(prompt, about) {
			if (about) asked.push({ ...about, prompt });
			return undefined;
		}
	},
	store,
	{
		limit: Number(process.env.NARRATE_LIMIT ?? 25),
		from: startStop(narrator, config).id,
		// NARRATE_ONLY=busier narrates only stops whose data has something going on.
		...(process.env.NARRATE_ONLY === 'busier' ? { only: isBusier } : {})
	}
);

const out = process.env.PROMPTS_PATH ?? 'build/narrate/prompts.md';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
	out,
	[
		"# Guide's voice (the system prompt)",
		'',
		asked[0]?.prompt.system ?? '',
		...asked.flatMap(({ stop, key, prompt }) => ['', `## ${key} (stop ${stop})`, '', prompt.user])
	].join('\n') + '\n'
);
console.log(`${asked.length} prompts written to ${out}`);
