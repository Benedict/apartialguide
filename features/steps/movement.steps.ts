import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { destination, distance, distanceToPolyline } from '../../src/lib/core/geo';
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
	// Streets of their own names: two unnamed ways meeting would be one path bending.
	const centre = world.map.node(O);
	bearings.forEach((b, i) =>
		world.map.way([centre, world.map.nodeFrom(O, b, 40)], {
			highway: 'residential',
			name: `Street ${i + 1}`
		})
	);
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
		// A node every 10 m, as streets are drawn, so other ways can join it part way along.
		this.street = Array.from({ length: Math.floor(metres / 10) + 1 }, (_, i) => {
			const at = Math.min(i * 10, metres);
			return { id: at === 0 ? this.map.node(O) : this.map.nodeFrom(O, 90, at), metres: at };
		});
		if (this.street.at(-1)!.metres < metres)
			this.street.push({ id: this.map.nodeFrom(O, 90, metres), metres });
		this.map.way(this.street.map((n) => n.id));
		this.here = junctionId(this.street[0].id);
	}
);

/** The street's node nearest `metres` along it. */
const streetAt = (world: NarratorWorld, metres: number) =>
	world.street.reduce((best, n) =>
		Math.abs(n.metres - metres) < Math.abs(best.metres - metres) ? n : best
	);

Given(
	'a driveway, a parking aisle, a pavement and a crossing leave it part way along',
	function (this: NarratorWorld) {
		const minor: Record<string, string>[] = [
			{ highway: 'service', service: 'driveway' },
			{ highway: 'service', service: 'parking_aisle' },
			{ highway: 'footway', footway: 'sidewalk' },
			{ highway: 'footway', footway: 'crossing' }
		];
		minor.forEach((tags, i) => {
			const from = streetAt(this, 40 + 40 * i);
			this.map.way([from.id, this.map.nodeFrom(this.map.position(from.id), 0, 30)], tags);
		});
	}
);

Given(
	'a main road no one walks along, with a street leaving it north and another leaving it south',
	function (this: NarratorWorld) {
		const west = this.map.nodeFrom(O, 270, 100);
		const north = this.map.node(O);
		const south = this.map.nodeFrom(O, 90, 40);
		const east = this.map.nodeFrom(O, 90, 140);
		this.map.way([west, north, south, east], { highway: 'trunk', name: 'Long Road' });
		const up = this.map.nodeFrom(O, 0, 120);
		this.map.way([north, up], { highway: 'residential', name: 'Short Row' });
		const down = this.map.nodeFrom(this.map.position(south), 180, 120);
		this.map.way([south, down], { highway: 'residential', name: 'Blind Alley' });
		this.here = junctionId(up);
		this.subjects = [junctionId(down)];
		this.street = [
			{ id: north, metres: 0 },
			{ id: south, metres: 40 }
		];
	}
);

Given(
	'the only way between them is along a pavement and over a crossing',
	function (this: NarratorWorld) {
		const [north, south] = this.street.map((n) => n.id);
		// A pavement along the north side, from the north street to a crossing, and over to the south street.
		const kerb = this.map.nodeFrom(this.map.position(north), 90, 20);
		this.map.way([north, kerb], { highway: 'footway', footway: 'sidewalk' });
		this.map.way([kerb, south], { highway: 'footway', footway: 'crossing' });
	}
);

When('the reader walks from the north street', function (this: NarratorWorld) {
	const graph = this.narrator.graph;
	const seen = new Set([this.here!]);
	const queue = [this.here!];
	while (queue.length)
		for (const e of graph.get(queue.pop()!)!.exits)
			if (!seen.has(e.to)) {
				seen.add(e.to);
				queue.push(e.to);
			}
	this.path = [...seen];
});

Then('the south street can be reached', function (this: NarratorWorld) {
	assert.ok(this.path.includes(this.subjects[0]), `reached ${this.path.join(', ')}`);
});

Given(
	'an unnamed {word} road {int} metres long leaves it part way along and ends',
	function (this: NarratorWorld, highway: string, metres: number) {
		const from = streetAt(this, 100);
		this.map.way([from.id, this.map.nodeFrom(this.map.position(from.id), 0, metres)], { highway });
	}
);

Given(
	'an unnamed footpath {int} metres long leaves it part way along and ends',
	function (this: NarratorWorld, metres: number) {
		const from = streetAt(this, 100);
		this.map.way([from.id, this.map.nodeFrom(this.map.position(from.id), 0, metres)], {
			highway: 'footway'
		});
		this.subjects = [junctionId(from.id)];
	}
);

Then('the footpath is a way to go from the street', function (this: NarratorWorld) {
	const stop = this.narrator.graph.get(this.subjects[0]);
	assert.ok(stop, 'no stop where the footpath leaves');
	assert.deepEqual(stop.exits.map((e) => e.label).sort(), ['east', 'north', 'west']);
});

Given(
	'an unnamed way {int} metres long leaves it part way along and ends',
	function (this: NarratorWorld, metres: number) {
		const from = streetAt(this, 100);
		this.map.way([from.id, this.map.nodeFrom(this.map.position(from.id), 0, metres)], {
			highway: 'service'
		});
	}
);

Given(
	'a street called {string} runs {int} metres, drawn as three ways',
	function (this: NarratorWorld, name: string, metres: number) {
		const nodes = [0, 1, 2, 3].map((i) =>
			i === 0 ? this.map.node(O) : this.map.nodeFrom(O, 90, (metres * i) / 3)
		);
		for (let i = 1; i < nodes.length; i++)
			this.map.way([nodes[i - 1], nodes[i]], { highway: 'residential', name });
		this.here = junctionId(nodes[0]);
		this.subjects = [junctionId(nodes[3])];
	}
);

Then('there is no stop between its ends', function (this: NarratorWorld) {
	assert.deepEqual(this.path, [this.here, this.subjects[0]]);
});

Given(
	'a street runs {int} metres east, called {string} and then {string}',
	function (this: NarratorWorld, metres: number, first: string, then: string) {
		const [a, mid, b] = [0, metres / 2, metres].map((m) =>
			m === 0 ? this.map.node(O) : this.map.nodeFrom(O, 90, m)
		);
		this.map.way([a, mid], { highway: 'residential', name: first });
		this.map.way([mid, b], { highway: 'residential', name: then });
		this.here = junctionId(a);
		this.subjects = [junctionId(mid)];
	}
);

Then(
	'there is a stop where {string} becomes {string}',
	function (this: NarratorWorld, _first: string, _then: string) {
		assert.deepEqual(this.path.slice(0, 2), [this.here, this.subjects[0]]);
	}
);

Given(
	'a {word} called {string} stands beside it {int} metres along',
	function (this: NarratorWorld, kind: string, name: string, metres: number) {
		const tags: Record<string, string> =
			kind === 'pub' ? { amenity: 'pub', name } : { shop: kind, name };
		this.map.node(destination(destination(O, 90, metres), 0, 12), tags);
		this.placed[name] = metres;
	}
);

const placed = (world: NarratorWorld) => world.placed;
const metresAlong = (world: NarratorWorld, id: string) =>
	distance(
		world.narrator.graph.get(world.path[0])!.position,
		world.narrator.graph.get(id)!.position
	);

Then(
	"a stop is within {int} metres of the street's nearest point to {string}",
	function (this: NarratorWorld, within: number, name: string) {
		const at = placed(this)[name];
		assert.ok(
			this.path.some((id) => Math.abs(metresAlong(this, id) - at) <= within),
			`stops at ${this.path.map((id) => metresAlong(this, id).toFixed(0)).join(', ')} m`
		);
	}
);

Then(
	'no two stops along it are more than {int} metres apart',
	function (this: NarratorWorld, most: number) {
		for (let i = 1; i < this.path.length; i++)
			assert.ok(metresAlong(this, this.path[i]) - metresAlong(this, this.path[i - 1]) <= most);
	}
);

Then(
	'one stop lies between {string} and {string}',
	function (this: NarratorWorld, a: string, b: string) {
		const [from, to] = [placed(this)[a], placed(this)[b]];
		const between = this.path.filter((id) => {
			const m = metresAlong(this, id);
			return m >= from - 15 && m <= to + 15;
		});
		assert.equal(
			between.length,
			1,
			`stops at ${this.path.map((id) => metresAlong(this, id).toFixed(0)).join(', ')} m`
		);
	}
);

Given(
	'a main street runs east to west, with a side street leaving north and another south {int} metres further east',
	function (this: NarratorWorld, apart: number) {
		const west = this.map.nodeFrom(O, 270, 100);
		const x = this.map.node(O);
		const y = this.map.nodeFrom(O, 90, apart);
		const east = this.map.nodeFrom(O, 90, 100);
		this.map.way([west, x, y, east], { highway: 'residential', name: 'Long Street' });
		this.map.way([x, this.map.nodeFrom(O, 0, 100)], { highway: 'residential', name: 'Short Row' });
		this.map.way([y, this.map.nodeFrom(this.map.position(y), 180, 100)], {
			highway: 'residential',
			name: 'Blind Alley'
		});
		this.here = junctionId(x);
	}
);

When('the reader walks along it', function (this: NarratorWorld) {
	this.path = this.narrator.graph.walk(this.here!, 'east');
});

Then(
	'it is divided into stops about {int} metres apart',
	function (this: NarratorWorld, spacing: number) {
		const g = this.narrator.graph;
		// Nothing along the way stops the walk short of the far end.
		if (this.street.length)
			assert.equal(this.path.at(-1), junctionId(this.street.at(-1)!.id), 'stopped short');
		for (let i = 1; i < this.path.length; i++) {
			const gap = distance(g.get(this.path[i - 1])!.position, g.get(this.path[i])!.position);
			assert.ok(gap <= spacing + 0.5 && gap >= spacing * 0.8, `gap of ${gap.toFixed(1)} m`);
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
		this.map.way([a, j], { highway: 'residential', name: 'Long Street' });
		this.map.way([j, this.map.nodeFrom(this.map.position(j), 0, 60)], {
			highway: 'residential',
			name: 'Short Row'
		});
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
	assert.ok(distance(g.get(previous)!.position, g.get(last)!.position) <= 150);
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
