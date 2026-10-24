import { describe, expect, it } from 'vitest';
import { fixedClock } from './facts';
import { narrateWorld } from './narration';
import { Narrator } from './narrator';
import type { NarrationStore } from './render/cached';
import { junctionId } from './stops';
import { RecordedModel } from './testing/recorded';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

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

describe('narrateWorld', () => {
	it('writes prose for every stop that has none, once for stops with the same facts', async () => {
		const { n } = narrator();
		const store: NarrationStore = {};
		const result = await narrateWorld(
			n,
			new RecordedModel(() => 'A street. “rumb”, it says.'),
			store
		);
		expect(result.written + result.kept).toBe(n.graph.all().length);
		expect(Object.keys(store)).toHaveLength(result.written);
		expect(Object.values(store)[0]).toMatchObject({
			paragraphs: ['A street. “rumb”, it says.'],
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
		await narrateWorld(n, new RecordedModel(() => '“rumb”.'), store);
		const again = new RecordedModel(() => 'Different. “rumb”.');
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
});
