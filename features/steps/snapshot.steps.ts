import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { distance, distanceToPolyline, type LatLon } from '../../src/lib/core/geo';
import { elementRef, OsmIndex, type OsmElement } from '../../src/lib/core/osm';
import { loadHistory } from '../../src/lib/server/narrator';
import type { NarratorWorld } from '../support/world';

const snapshotDir = () => process.env.SNAPSHOT_DIR ?? 'data/snapshots';

Given(
	'the OSM snapshot dated {string} for Addiscombe',
	function (this: NarratorWorld, date: string) {
		this.snapshotDate = date;
		this.data = JSON.parse(readFileSync(`${snapshotDir()}/addiscombe-${date}.json`, 'utf8'));
	}
);

const index = (world: NarratorWorld) => new OsmIndex(world.data!);

function element(world: NarratorWorld, ref: string): OsmElement {
	const e = world.data!.elements.find((x) => elementRef(x) === ref);
	assert.ok(e, `${ref} is not in the snapshot`);
	return e;
}

function geometry(world: NarratorWorld, e: OsmElement): LatLon[] {
	if (e.type === 'node') return [[e.lat, e.lon]];
	if (e.type === 'way') return index(world).wayGeometry(e);
	return [];
}

/** "209-213 Lower Addiscombe Road" → numbers 209 to 213 on that street. */
function parseAddress(address: string) {
	const m = address.match(/^(\d+)(?:-(\d+))?\s+(.+)$/);
	assert.ok(m, `cannot read address ${address}`);
	return { from: Number(m[1]), to: Number(m[2] ?? m[1]), street: m[3] };
}

/** Elements whose address overlaps the given number or range. */
function atAddress(world: NarratorWorld, address: string): OsmElement[] {
	const want = parseAddress(address);
	return world.data!.elements.filter((e) => {
		const t = e.tags;
		if (!t?.['addr:housenumber'] || t['addr:street'] !== want.street) return false;
		const nums = t['addr:housenumber'].match(/\d+/g)!.map(Number);
		const [lo, hi] = [Math.min(...nums), Math.max(...nums)];
		return lo <= want.to && hi >= want.from;
	});
}

Given(
	'way {int} has old_name {string} and disused:amenity {string}',
	function (this: NarratorWorld, id: number, oldName: string, disused: string) {
		const tags = element(this, `way/${id}`).tags ?? {};
		assert.equal(tags.old_name, oldName);
		assert.equal(tags['disused:amenity'], disused);
		this.subjects = [`way/${id}`];
	}
);

When('the reader stands outside {string}', function (this: NarratorWorld, address: string) {
	const found = atAddress(this, address);
	assert.ok(found.length, `nothing at ${address} in the snapshot`);
	// Outside means on the street the address names, at the stop nearest the building.
	const { street } = parseAddress(address);
	const shape = geometry(this, found[0]);
	const onStreet = this.narrator.graph
		.all()
		.filter((s) => s.exits.some((e) => e.street === street));
	const nearest = onStreet.sort(
		(a, b) => distanceToPolyline(a.position, shape) - distanceToPolyline(b.position, shape)
	)[0];
	this.arrive(nearest?.id);
});

Then('the narration mentions {string}', function (this: NarratorWorld, words: string) {
	assert.ok(this.visit!.text.includes(words), this.visit!.text);
	this.subjects = [...this.subjects, words];
});

Then('the narration does not mention {string}', function (this: NarratorWorld, words: string) {
	assert.ok(!this.visit!.text.includes(words), this.visit!.text);
});

Then('the narration does not repair it to another name', function (this: NarratorWorld) {
	const words = this.subjects.at(-1)!;
	const glued = new RegExp(`[\\p{L}\\p{N}]${words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u');
	assert.ok(!glued.test(this.visit!.text), this.visit!.text);
});

Given(
	'{string} carry survey:date {string}',
	function (this: NarratorWorld, address: string, date: string) {
		const found = atAddress(this, address).filter((e) => e.tags?.shop || e.tags?.['survey:date']);
		assert.ok(found.length, `nothing at ${address} in the snapshot`);
		for (const e of found)
			assert.equal(e.tags?.['survey:date'], date, `${elementRef(e)} survey:date`);
		this.subjects = found.map(elementRef);
	}
);

Then('the narration of those shops contains a tense slip', function (this: NarratorWorld) {
	const slipped = this.visit!.plan.beats.filter(
		(b) => this.subjects.includes(b.subject) && b.effects.includes('tense-slip')
	);
	assert.ok(
		slipped.length,
		`no tense slip among ${this.visit!.plan.beats.map((b) => b.subject).join(', ')}`
	);
});

const evertonRoad = (world: NarratorWorld) =>
	index(world).ways.filter((w) => w.tags?.name === 'Everton Road' && w.tags.highway);

Given('Everton Road has only {} tags', function (this: NarratorWorld, list: string) {
	const allowed = new Set([...list.split(/,\s*(?:and\s+)?|\s+and\s+/), 'name']);
	const ways = evertonRoad(this);
	assert.ok(ways.length, 'Everton Road is not in the snapshot');
	for (const w of ways) {
		const extra = Object.keys(w.tags!).filter((k) => !allowed.has(k));
		assert.deepEqual(extra, [], `way/${w.id} has more tags than expected`);
	}
});

Given('no buildings are mapped along it', function (this: NarratorWorld) {
	// Corner buildings at either end (any part within 20 m) belong to the streets Everton Road meets, so the 20 m at each end don't count.
	const osm = index(this);
	const road = evertonRoad(this).flatMap((w) => osm.wayGeometry(w));
	const ends = [road[0], road.at(-1)!];
	const near = osm.ways.filter((w) => {
		const shape = osm.wayGeometry(w);
		const touches = shape.some((p) => distanceToPolyline(p, road) < 15);
		const atCorner = shape.some((p) => ends.some((end) => distance(p, end) <= 20));
		return w.tags?.building && touches && !atCorner;
	});
	assert.deepEqual(near.map(elementRef), []);
});

When('the reader is on Everton Road', function (this: NarratorWorld) {
	const ids = new Set(evertonRoad(this).map((w) => w.id));
	const stop = this.narrator.graph
		.all()
		.find((s) => s.kind === 'corridor' && s.exits.every((e) => ids.has(e.wayId)));
	this.arrive(stop?.id);
});

Then('the narration speaks of surface, lighting, and speed', function (this: NarratorWorld) {
	const text = this.visit!.text;
	assert.match(text, /underfoot/);
	assert.match(text, /lit|unlit/i);
	assert.match(text, /mph|km\/h|\d/);
});

Then('the narration hesitates or falls silent', function (this: NarratorWorld) {
	assert.equal(this.visit!.plan.mood, 'hesitant');
});

Then(
	'the narration does not place the button factory on Everton Road',
	function (this: NarratorWorld) {
		assert.doesNotMatch(this.visit!.text, /button/i);
	}
);

Given('the past maps of Addiscombe', function (this: NarratorWorld) {
	this.history = loadHistory(process.env.HISTORY_DIR ?? 'data/history');
	assert.ok(this.history.length, 'no past maps in data/history');
	this.rebuild();
});

Given(
	'node {int} was called {string} in the map of {word} and carries no tags now',
	function (this: NarratorWorld, id: number, name: string, asOf: string) {
		const past = this.history.find((h) => h.asOf === asOf);
		assert.ok(past, `no past map as of ${asOf}`);
		const then = past.data.elements.find((e) => e.type === 'node' && e.id === id);
		assert.equal(then?.tags?.name, name);
		const now = this.data!.elements.find((e) => e.type === 'node' && e.id === id);
		assert.ok(now, `node/${id} is not in the snapshot`);
		assert.equal(now.tags, undefined);
	}
);
