import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { Adventure, type Reply } from '../../src/lib/core/adventure/engine';
import { compileWorld } from '../../src/lib/core/adventure/world';
import { narrateWorld } from '../../src/lib/core/narration';
import { CachedRenderer, type NarrationStore } from '../../src/lib/core/render/cached';
import { RecordedModel } from '../../src/lib/core/testing/recorded';
import { bearing, destination } from '../../src/lib/core/geo';
import type { OsmElement } from '../../src/lib/core/osm';
import { junctionId } from '../../src/lib/core/stops';
import { SyntheticMap } from '../../src/lib/core/testing/synthetic';
import type { NarratorWorld } from '../support/world';

const O = SyntheticMap.ORIGIN;

interface AdventureState {
	game?: Adventure;
	started?: string;
	reply?: Reply;
	streetStart?: number;
}
const state = (w: NarratorWorld) => w as NarratorWorld & AdventureState;

Given(
	'an invented street called {string} running east from {string} to {string}',
	function (this: NarratorWorld, name: string, from: string, to: string) {
		const s = state(this);
		const west = this.map.node(O);
		const east = this.map.nodeFrom(O, 90, 200);
		this.map.way([west, east], { highway: 'residential', name });
		this.map.way([west, this.map.nodeFrom(O, 180, 40)], { highway: 'residential', name: from });
		this.map.way([east, this.map.nodeFrom(this.map.position(east), 0, 40)], {
			highway: 'residential',
			name: to
		});
		s.streetStart = west;
	}
);

Given('a pub called {string} beside Long Street', function (this: NarratorWorld, name: string) {
	this.map.node(destination(destination(O, 90, 85), 0, 10), { amenity: 'pub', name });
});

Given('six benches right beside the reader', function (this: NarratorWorld) {
	const s = state(this);
	const here = this.narrator.graph.get(s.started!)!.position;
	for (let i = 0; i < 6; i++) this.map.node(destination(here, i * 60, 3), { amenity: 'bench' });
	this.rebuild();
	s.game = new Adventure(compileWorld(this.narrator, s.started!));
});

Given(
	'prose has been written ahead of time for every stop, reading {string}',
	async function (this: NarratorWorld, prose: string) {
		const s = state(this);
		const store: NarrationStore = {};
		await narrateWorld(this.narrator, new RecordedModel(() => prose), store);
		this.renderer = new CachedRenderer(store);
		this.rebuild();
		s.game = new Adventure(compileWorld(this.narrator, s.started!));
	}
);

/** Adds a past map to the scenario and restarts the game from the same stop. */
function withPast(world: NarratorWorld, asOf: string, elements: OsmElement[]) {
	const s = state(world);
	world.history.push({ asOf, data: { elements } });
	world.rebuild();
	s.game = new Adventure(compileWorld(world.narrator, s.started!));
}

Given(
	'the map of {word} had a bakery called {string} right beside the reader',
	function (this: NarratorWorld, asOf: string, name: string) {
		const here = this.narrator.graph.get(state(this).started!)!.position;
		const now = this.map.toData().elements;
		const bakery: OsmElement = {
			type: 'node',
			id: 9_999,
			lat: here[0],
			lon: here[1] + 0.00005,
			tags: { shop: 'bakery', name }
		};
		withPast(this, asOf, [...now, bakery]);
	}
);

Given(
	'the map of {word} called the pub {string}',
	function (this: NarratorWorld, asOf: string, name: string) {
		const past = this.map
			.toData()
			.elements.map((e) => (e.tags?.amenity === 'pub' ? { ...e, tags: { ...e.tags, name } } : e));
		withPast(this, asOf, past);
	}
);

Given('the reader starts part way along Long Street', function (this: NarratorWorld) {
	const s = state(this);
	const start = this.narrator.graph.walk(junctionId(s.streetStart!), 'east')[2];
	s.game = new Adventure(compileWorld(this.narrator, start));
	s.started = start;
});

const replyText = (r?: Reply) => [r?.title, ...(r?.lines ?? [])].join('\n');

When('the game begins', function (this: NarratorWorld) {
	const s = state(this);
	const replies = s.game!.begin();
	s.reply = { lines: replies.flatMap((r) => [...(r.title ? [r.title] : []), ...r.lines]) };
});

When('the reader types {string}', function (this: NarratorWorld, input: string) {
	const s = state(this);
	s.reply = s.game!.respond(input);
});

Then('it says {string}', function (this: NarratorWorld, words: string) {
	const text = replyText(state(this).reply);
	assert.ok(text.includes(words), text);
});

Then('it does not say {string}', function (this: NarratorWorld, words: string) {
	const text = replyText(state(this).reply);
	assert.ok(!text.includes(words), text);
});

Then('the reader has moved east', function (this: NarratorWorld) {
	const s = state(this);
	const g = this.narrator.graph;
	assert.notEqual(s.game!.here, s.started);
	const b = bearing(g.get(s.started!)!.position, g.get(s.game!.here)!.position);
	assert.ok(Math.abs(b - 90) < 10, `moved on a bearing of ${b}`);
});

Then('the reader is where they started', function (this: NarratorWorld) {
	const s = state(this);
	assert.equal(s.game!.here, s.started);
});
