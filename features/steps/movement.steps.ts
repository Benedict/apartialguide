import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { distance, distanceToPolyline } from '../../src/lib/core/geo';
import { junctionId } from '../../src/lib/core/stops';
import { SyntheticMap } from '../../src/lib/core/testing/synthetic';
import type { NarratorWorld } from '../support/world';

const O = SyntheticMap.ORIGIN;
const BEARINGS: Record<string, number> = {
	north: 0,
	'north-east': 45,
	east: 90,
	'south-east': 135,
	south: 180,
	'south-west': 225,
	west: 270,
	'north-west': 315
};

/** "north-east, south, and west" → ["north-east", "south", "west"] */
const parseList = (text: string) => text.split(/,\s*(?:and\s+)?|\s+and\s+/).map((s) => s.trim());

function starJunction(world: NarratorWorld, bearings: number[]) {
	const centre = world.map.node(O);
	for (const b of bearings) world.map.way([centre, world.map.nodeFrom(O, b, 40)]);
	world.here = junctionId(centre);
}

Given(
	'the reader is at a junction where streets leave to the {}',
	function (this: NarratorWorld, list: string) {
		starJunction(
			this,
			parseList(list).map((d) => BEARINGS[d])
		);
	}
);

Given(
	'a street leaves a junction on a bearing of {int} degrees',
	function (this: NarratorWorld, b: number) {
		starJunction(this, [b]);
	}
);

Given(
	'streets leave a junction on bearings of {int} and {int} degrees',
	function (this: NarratorWorld, a: number, b: number) {
		starJunction(this, [a, b]);
	}
);

When('the reader is offered directions', function (this: NarratorWorld) {
	this.arrive(this.here);
	this.offered = this.visit!.exits.map((e) => e.label);
});

Then('the choices are {}', function (this: NarratorWorld, list: string) {
	assert.deepEqual([...this.offered].sort(), parseList(list).sort());
});

Then('{word} is not offered', function (this: NarratorWorld, label: string) {
	assert.ok(!this.offered.includes(label));
});

Then('that exit is labelled {word}', function (this: NarratorWorld, label: string) {
	assert.deepEqual(this.offered, [label]);
});

Given(
	'a street runs {int} metres between two junctions',
	function (this: NarratorWorld, metres: number) {
		const a = this.map.node(O);
		this.map.way([a, this.map.nodeFrom(O, 90, metres)]);
		this.here = junctionId(a);
	}
);

When('the reader walks along it', function (this: NarratorWorld) {
	this.path = this.narrator.graph.walk(this.here!, 'east');
});

Then(
	'it is divided into stops about {int} metres apart',
	function (this: NarratorWorld, spacing: number) {
		const g = this.narrator.graph;
		for (let i = 1; i < this.path.length; i++) {
			const gap = distance(g.get(this.path[i - 1])!.position, g.get(this.path[i])!.position);
			assert.ok(gap <= spacing && gap >= spacing * 0.8, `gap of ${gap.toFixed(1)} m`);
		}
	}
);

Then(
	'each stop between the junctions offers only the two directions along the street',
	function (this: NarratorWorld) {
		for (const id of this.path.slice(1, -1)) {
			const labels = this.narrator.graph.get(id)!.exits.map((e) => e.label);
			assert.deepEqual(labels.sort(), ['east', 'west']);
		}
	}
);

Given(
	'a junction lies within {int} metres of the previous stop',
	function (this: NarratorWorld, _within: number) {
		const a = this.map.node(O);
		const j = this.map.nodeFrom(O, 90, 120);
		this.map.way([a, j]);
		this.map.way([j, this.map.nodeFrom(this.map.position(j), 0, 40)]);
		this.here = junctionId(a);
		this.subjects = [junctionId(j)];
	}
);

When('the next stop is placed', function (this: NarratorWorld) {
	this.path = this.narrator.graph.walk(this.here!, 'east');
});

Then('the junction is that stop', function (this: NarratorWorld) {
	const g = this.narrator.graph;
	const [last, previous] = [this.path.at(-1)!, this.path.at(-2)!];
	assert.equal(last, this.subjects[0]);
	assert.ok(distance(g.get(previous)!.position, g.get(last)!.position) <= 50);
});

Given('a stop on Everton Road with only highway tags in reach', function (this: NarratorWorld) {
	const a = this.map.node(O);
	const b = this.map.nodeFrom(O, 90, 230);
	this.map.way([a, b], {
		highway: 'residential',
		name: 'Everton Road',
		lit: 'yes',
		maxspeed: '20 mph',
		surface: 'asphalt',
		sidewalk: 'both'
	});
	this.map.nodeFrom(O, 0, 80, { shop: 'bakery', name: 'Out of Reach' });
	this.here = this.narrator.graph.walk(junctionId(a), 'east')[2];
});

When('the reader arrives', function (this: NarratorWorld) {
	this.arrive(this.here);
});

Then('the stop exists', function (this: NarratorWorld) {
	assert.ok(this.visit, `no stop ${this.here}`);
});

Then('the narration draws on nothing beyond reach to fill it', function (this: NarratorWorld) {
	const { stop, plan, text } = this.visit!;
	for (const f of [...plan.street, ...plan.beats.flatMap((b) => b.facts)]) {
		assert.ok(distanceToPolyline(stop.position, f.geometry) <= f.reach, `${f.id} is beyond reach`);
	}
	assert.ok(!text.includes('Out of Reach'));
});
