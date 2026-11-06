import { describe, expect, it } from 'vitest';
import { fixedClock } from './facts';
import { destination } from './geo';
import { narrateWorld, pruneNarration } from './narration';
import { buildPrompt, promptKey } from './render/prompt';
import { Narrator } from './narrator';
import type { NarrationStore } from './render/cached';
import { junctionId } from './stops';
import { RecordedModel } from './testing/recorded';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

/** Prose made of a stop's own facts: the broken name only where the stop's facts hold it. */
const said = (text: string) => (prompt: { user: string }) =>
	prompt.user.split(/\n\nAlready said/)[0].includes('“rumb”') ? `${text} “rumb”.` : text;

/** An invented street of a few stops, with a broken name beside its west end. */
function narrator() {
	const m = new SyntheticMap();
	const west = m.node(O);
	m.way([west, m.nodeFrom(O, 90, 120)], { highway: 'residential', name: 'Long Street' });
	m.nodeFrom(O, 0, 8, { shop: 'bakery', old_name: 'rumb' });
	return {
		n: Narrator.fromOsm(m.toData(), { clock: fixedClock('2026-10-24') }),
		west: junctionId(west)
	};
}

/** An invented street long enough for several stops, a bakery of its own name at each. */
function longStreet() {
	const m = new SyntheticMap();
	const west = m.node(O);
	m.way([west, m.nodeFrom(O, 90, 600)], { highway: 'residential', name: 'Long Street' });
	// So no two stops share their facts.
	['Alder', 'Birch', 'Cedar', 'Damson', 'Elder'].forEach((name, i) =>
		m.node(destination(destination(O, 90, i * 150), 0, 8), { shop: 'bakery', name })
	);
	return {
		n: Narrator.fromOsm(m.toData(), { clock: fixedClock('2026-10-24') }),
		west: junctionId(west)
	};
}

/** The same prose stored for three stops other than `west`, under their current facts. */
function storedElsewhere(n: Narrator, west: string, text: string): NarrationStore {
	const others = n.graph
		.all()
		.filter((s) => s.id !== west)
		.slice(0, 3);
	return Object.fromEntries(
		others.map((s) => [
			promptKey(buildPrompt(n.visit(s.id)!.scene)),
			{ paragraphs: [text], model: 'x', written: '2026-10-24' }
		])
	);
}

describe('narrateWorld', () => {
	it('writes prose for every stop that has none, once for stops with the same facts', async () => {
		const { n } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(said('A street.')), store);
		expect(result.written + result.kept).toBe(n.graph.all().length);
		expect(Object.keys(store)).toHaveLength(result.written);
		expect(Object.values(store)[0]).toMatchObject({
			paragraphs: ['A street. “rumb”.'],
			model: 'recorded'
		});
	});

	it('splits prose into paragraphs at blank lines', async () => {
		const { n } = narrator();
		const store: NarrationStore = {};
		await narrateWorld(n, new RecordedModel(() => 'One. “rumb”.\n\nTwo.\n'), store, { limit: 1 });
		expect(Object.values(store)[0].paragraphs).toEqual(['One. “rumb”.', 'Two.']);
	});

	it('leaves stops that already have prose alone', async () => {
		const { n } = narrator();
		const store: NarrationStore = {};
		await narrateWorld(n, new RecordedModel(said('Here.')), store);
		const again = new RecordedModel(said('Different.'));
		const result = await narrateWorld(n, again, store);
		expect(result.written).toBe(0);
		expect(again.prompts).toHaveLength(0);
	});

	it('stops after the limit, nearest the given stop first', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		const model = new RecordedModel(() => '“rumb”.');
		const result = await narrateWorld(n, model, store, { limit: 1, from: west });
		expect(result.written).toBe(1);
		expect(result.remaining).toBe(n.graph.all().length - 1);
		expect(model.prompts[0].user).toContain('rumb');
	});

	it('does not store prose that repairs a broken name', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(() => 'Crumb, the bakery.'), store, {
			limit: 1,
			from: west
		});
		expect(result.rejected).toEqual([west]);
		expect(store).toEqual({});
	});

	it('notes a stop the model declined, and stores nothing for it', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(() => undefined), store, {
			limit: 1,
			from: west
		});
		expect(result.declined).toEqual([west]);
		expect(store).toEqual({});
	});

	it('shows the model what the stops next door already say, without changing how prose is found', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		let i = 0;
		const words = ['one', 'two', 'three'];
		const model = new RecordedModel((p) => said(`Prose number ${words[i++]}.`)(p));
		await narrateWorld(n, model, store, { limit: 2, from: west });
		expect(model.prompts[0].user).not.toMatch(/already said/i);
		expect(model.prompts[1].user).toMatch(/already said at the places next to this one/i);
		expect(model.prompts[1].user).toContain('Prose number one.');
		const second = n.graph
			.all()
			.find((s) => model.prompts[1].user.startsWith(buildPrompt(n.visit(s.id)!.scene).user))!;
		expect(store[promptKey(buildPrompt(n.visit(second.id)!.scene))].paragraphs[0]).toMatch(
			/^Prose number two\./
		);
	});

	it('does not store prose that names a source', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(() => '“rumb”, says Wikidata.'), store, {
			limit: 1,
			from: west
		});
		expect(result.rejected).toEqual([west]);
		expect(store).toEqual({});
	});

	it('does not store prose that says what the facts do not, and says what it was', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(
			n,
			new RecordedModel(() => '“rumb”, a Victorian bakery since 1887.'),
			store,
			{ limit: 1, from: west }
		);
		expect(result.rejected).toEqual([west]);
		expect(result.unfounded).toEqual([{ stop: west, words: ['1887', 'Victorian'] }]);
		expect(store).toEqual({});
	});

	it('tells the model which stop and key it writes for, so prose written elsewhere can be found', async () => {
		const { n, west } = narrator();
		const asked: { stop: string; key: string }[] = [];
		const model = {
			name: 'written',
			async write(_prompt: unknown, about?: { stop: string; key: string }) {
				if (about) asked.push(about);
				return '“rumb”.';
			}
		};
		await narrateWorld(n, model, {}, { limit: 1, from: west });
		expect(asked[0].stop).toBe(west);
		expect(asked[0].key).toBe(promptKey(buildPrompt(n.visit(west)!.scene)));
	});

	it('narrates only the stops it is asked to, and leaves the rest to the template', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(said('A street.')), store, {
			only: (scene) => scene.stopId === west
		});
		expect(result.written).toBe(1);
		expect(result.skipped).toBe(n.graph.all().length - 1);
	});

	it('looks only at the stops within the area asked for, never visiting the rest', async () => {
		const { n, west } = narrator();
		const visited = new Set<string>();
		const visit = n.visit.bind(n);
		n.visit = (id) => (visited.add(id), visit(id));
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(said('A street.')), store, {
			within: (stop) => stop.id === west
		});
		expect(result.written).toBe(1);
		expect([...visited]).toEqual([west]);
	});

	it('does not store a turn of phrase already used in several places', async () => {
		const { n } = longStreet();
		const phrase = 'and the dark sits quietly between them all';
		const store: NarrationStore = {};
		const result = await narrateWorld(n, new RecordedModel(said(`Here, ${phrase}.`)), store);
		expect(result.written).toBe(3);
		expect(result.repeated).toHaveLength(n.graph.all().length - 3);
		expect(result.repeated[0].phrase).toMatch(/dark sits quietly/);
	});

	it('counts a turn of phrase only in prose a reader can meet, not in pieces for stops the map no longer has', async () => {
		const { n, west } = narrator();
		const phrase = 'and the dark sits quietly between them all';
		const store: NarrationStore = {
			a: { paragraphs: [`One street, ${phrase}.`], model: 'x', written: '2026-10-24' },
			b: { paragraphs: [`Another, ${phrase}.`], model: 'x', written: '2026-10-24' },
			c: { paragraphs: [`A third, ${phrase}.`], model: 'x', written: '2026-10-24' }
		};
		const result = await narrateWorld(n, new RecordedModel(said(`Here, ${phrase}.`)), store, {
			limit: 1,
			from: west
		});
		expect(result.repeated).toEqual([]);
		expect(result.written).toBe(1);
	});

	it('lets the facts’ own words recur, as they must', async () => {
		const { n, west } = narrator();
		const store: NarrationStore = {
			a: {
				paragraphs: ['You are at the end of Long Street, once more.'],
				model: 'x',
				written: '2026-10-24'
			},
			b: {
				paragraphs: ['You are at the end of Long Street, again.'],
				model: 'x',
				written: '2026-10-24'
			}
		};
		const result = await narrateWorld(
			n,
			new RecordedModel(said('You are at the end of Long Street, here.')),
			store,
			{ limit: 1, from: west }
		);
		expect(result.repeated).toEqual([]);
	});

	it('lets the facts be said again in another order, but not an instruction echoed', async () => {
		const { n, west } = longStreet();
		const store = (text: string) => storedElsewhere(n, west, text);
		// The facts' own words, reordered, are not a turn of phrase.
		const reordered = await narrateWorld(
			n,
			new RecordedModel(said('The end of Long Street, you are at.')),
			store('The end of Long Street, you are at.'),
			{ limit: 1, from: west }
		);
		expect(reordered.repeated).toEqual([]);
		// The prompt's instructions are not facts: echoing them is a stock phrase.
		const echoed = await narrateWorld(
			n,
			new RecordedModel(said('Do not list the exits; the game prints them.')),
			store('Do not list the exits; the game prints them.'),
			{ limit: 1, from: west }
		);
		expect(echoed.repeated.map((r) => r.stop)).toEqual([west]);
	});
});

describe('pruneNarration', () => {
	it('drops every piece kept for facts no stop has now, and keeps the rest', () => {
		const { n, west } = narrator();
		const key = promptKey(buildPrompt(n.visit(west)!.scene));
		const entry = { paragraphs: ['Invented.'], model: 'test', written: '2026-10-24' };
		const store: NarrationStore = { [key]: entry, 'v1-gone': entry, 'v16-gone': entry };
		expect(pruneNarration(n, store).sort()).toEqual(['v1-gone', 'v16-gone']);
		expect(Object.keys(store)).toEqual([key]);
	});
});
