/**
 * Narrates the same busier stops with several models and writes a report: how many each wrote, and
 * how many the guards refused and why, then each stop's template beside each model's prose. Nothing
 * is stored; the narration store is untouched. For choosing a model, not for writing the walk.
 *   MODELS="deepseek/deepseek-chat,qwen/qwen-2.5-72b-instruct,claude:claude-haiku-5-5" COMPARE_LIMIT=25 npm run compare
 * A model named "claude:<id>" is asked directly (ANTHROPIC_API_KEY); any other through OpenRouter
 * (OPENROUTER_API_KEY).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isBusier } from '../src/lib/core/busier';
import { narrateWorld, type NarrateResult, type ProseModel } from '../src/lib/core/narration';
import type { NarrationStore } from '../src/lib/core/render/cached';
import { buildPrompt, promptKey } from '../src/lib/core/render/prompt';
import { AnthropicProse } from '../src/lib/server/anthropic';
import { loadNarrator, readConfig, startStop } from '../src/lib/server/narrator';
import { OpenRouterProse } from '../src/lib/server/openrouter';
import Anthropic from '@anthropic-ai/sdk';

const config = readConfig();
const names = (process.env.MODELS ?? '')
	.split(',')
	.map((m) => m.trim())
	.filter(Boolean);
if (!config || !names.length) {
	console.error('Set SNAPSHOT_PATH, and MODELS to a comma-separated list of models to compare');
	process.exit(1);
}
const limit = Number(process.env.COMPARE_LIMIT ?? 25);
const narrator = loadNarrator(config);
const from = startStop(narrator, config).id;
const model = (name: string): ProseModel =>
	name.startsWith('claude:')
		? new AnthropicProse(new Anthropic(), name.slice(7))
		: new OpenRouterProse(name);

const runs: { name: string; store: NarrationStore; result: NarrateResult; seconds: number }[] = [];
for (const name of names) {
	const store: NarrationStore = {};
	const started = Date.now();
	const result = await narrateWorld(narrator, model(name), store, { limit, from, only: isBusier });
	runs.push({ name, store, result, seconds: Math.round((Date.now() - started) / 1000) });
	console.log(
		`${name}: wrote ${result.written}, refused ${result.rejected.length}, declined ${result.declined.length}`
	);
}

// The stops every model was asked about, in the order they were asked.
const stops = [...new Set(runs.flatMap((r) => [...r.result.rejected, ...r.result.declined]))];
const keyed = new Map<string, string>();
for (const s of narrator.graph.all()) {
	const v = narrator.visit(s.id);
	if (v && isBusier(v.scene)) keyed.set(promptKey(buildPrompt(v.scene)), s.id);
}
const order = [...new Set(runs.flatMap((r) => Object.keys(r.store)).concat(stops))].slice(0, limit);

const out = [
	'# Models compared on the same busier stops',
	'',
	'| Model | Written | Refused | Unfounded | Repeated | Declined | Seconds |',
	'|---|---|---|---|---|---|---|',
	...runs.map(
		({ name, result: r, seconds }) =>
			`| ${name} | ${r.written} | ${r.rejected.length} | ${r.unfounded.length} | ${r.repeated.length} | ${r.declined.length} | ${seconds} |`
	),
	'',
	'Refused: any guard (a broken name repaired, a source named, a fact not in the facts, a repeated phrase).',
	''
];
for (const run of runs)
	for (const { stop, words } of run.result.unfounded)
		out.push(`- ${run.name}, ${stop}: not in its facts: ${words.join(', ')}`);
out.push('');
for (const key of order) {
	const id = keyed.get(key) ?? key;
	const visit = narrator.visit(id);
	out.push(
		`## ${visit?.room.title ?? id}`,
		'',
		'**Template**',
		'',
		...(visit?.room.paragraphs ?? []).map((p) => `> ${p}`),
		''
	);
	for (const run of runs) {
		const said = run.store[key]?.paragraphs;
		out.push(
			`**${run.name}**`,
			'',
			...(said ? said.map((p) => `> ${p}`) : ['_(refused or declined; the template stands)_']),
			''
		);
	}
}
const path = process.env.COMPARE_PATH ?? 'build/compare/report.md';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, out.join('\n') + '\n');
console.log(`Report written to ${path}`);
