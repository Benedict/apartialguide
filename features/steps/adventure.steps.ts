import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { Adventure, type Reply } from '../../src/lib/core/adventure/engine';
import { compileWorld } from '../../src/lib/core/adventure/world';
import { narrateWorld } from '../../src/lib/core/narration';
import { CachedRenderer, type NarrationStore } from '../../src/lib/core/render/cached';
import { RecordedModel } from '../../src/lib/core/testing/recorded';
import { bearing, destination } from '../../src/lib/core/geo';
import type { OsmElement } from '../../src/lib/core/osm';
import type { WikidataItem } from '../../src/lib/core/adapters/wikidata';
import { currentWeatherFacts } from '../../src/lib/core/adapters/weather';
import { arrivalFacts, type TflArrival } from '../../src/lib/core/adapters/tfl';
import type { Fact } from '../../src/lib/core/facts';
import { junctionId } from '../../src/lib/core/stops';
import { SyntheticMap } from '../../src/lib/core/testing/synthetic';
import type { NarratorWorld } from '../support/world';

const O = SyntheticMap.ORIGIN;

interface AdventureState {
	game?: Adventure;
	started?: string;
	reply?: Reply;
	streetStart?: number;
	/** Today's weather, as the browser would fetch it. */
	now?: Fact[];
	/** What TfL would answer for a stop. */
	arrivals?: { naptan: string; arrivals: TflArrival[] };
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

/** Rebuilds the narrator with what the scenario has added, and restarts from the same stop. */
function restart(world: NarratorWorld) {
	const s = state(world);
	world.rebuild();
	if (s.started) s.game = new Adventure(compileWorld(world.narrator, s.started));
}

/** Adds a past map to the scenario and restarts the game from the same stop. */
function withPast(world: NarratorWorld, asOf: string, elements: OsmElement[]) {
	world.history.push({ asOf, data: { elements } });
	restart(world);
}

/** Puts an invented item in the scenario's Wikidata. */
function withItem(world: NarratorWorld, qid: string, item: WikidataItem) {
	world.wikidata ??= { retrieved: world.snapshotDate, items: {} };
	world.wikidata.items[qid] = item;
}

Given(
	'Long Street is named for {string}, described in Wikidata as {string}',
	function (this: NarratorWorld, label: string, description: string) {
		withItem(this, 'Q900000001', { label, description });
		this.map.tag(this.map.find({ name: 'Long Street' }), {
			'name:etymology:wikidata': 'Q900000001'
		});
		restart(this);
	}
);

Given(
	'Wikidata describes The Sextant as {string}',
	function (this: NarratorWorld, description: string) {
		withItem(this, 'Q900000002', { label: 'The Sextant', description });
		this.map.tag(this.map.find({ name: 'The Sextant' }), { wikidata: 'Q900000002' });
		restart(this);
	}
);

Given(
	'Wikidata places {string}, {string}, right beside the reader',
	function (this: NarratorWorld, label: string, description: string) {
		const here = this.narrator.graph.get(state(this).started!)!.position;
		withItem(this, 'Q900000003', {
			label,
			description,
			coordinates: destination(here, 0, 6)
		});
		restart(this);
	}
);

/** Words for the weather codes these scenarios use. */
const CODES: Record<string, number> = { overcast: 3, 'light rain': 61 };

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
	s.reply = s.game!.look();
});

Given(
	/^the weather now is ([a-z ]+), (-?\d+) °C$/,
	function (this: NarratorWorld, words: string, temperature: string) {
		state(this).now = currentWeatherFacts({
			current: {
				time: `${this.snapshotDate}T12:00`,
				weather_code: CODES[words],
				temperature_2m: Number(temperature)
			}
		});
	}
);

Given(
	'a building once called {string} at the west end of Long Street',
	function (this: NarratorWorld, name: string) {
		this.map.building(destination(O, 0, 12), 8, { building: 'yes', old_name: name });
	}
);

Given(
	'a pub called {string} at the west end of Long Street',
	function (this: NarratorWorld, name: string) {
		this.map.node(destination(O, 0, 8), { amenity: 'pub', name });
	}
);

Given(
	/^a house at "(\S+) ([^"]+)" (\d+) metres (north|south) of the reader$/,
	function (this: NarratorWorld, number: string, street: string, metres: string, way: string) {
		const s = state(this);
		const here = this.narrator.graph.get(s.started!)!.position;
		this.map.node(destination(here, way === 'north' ? 0 : 180, Number(metres)), {
			building: 'house',
			'addr:housenumber': number,
			'addr:street': street
		});
		restart(this);
	}
);

Given(
	'a bus stop called {string} with the code {string} right beside the reader',
	function (this: NarratorWorld, name: string, naptan: string) {
		const here = this.narrator.graph.get(state(this).started!)!.position;
		this.map.node(destination(here, 0, 5), {
			highway: 'bus_stop',
			public_transport: 'platform',
			name,
			'naptan:AtcoCode': naptan
		});
		restart(this);
	}
);

Given(
	'a tram stop called {string} right beside the reader',
	function (this: NarratorWorld, name: string) {
		const here = this.narrator.graph.get(state(this).started!)!.position;
		this.map.node(destination(here, 180, 5), {
			railway: 'tram_stop',
			public_transport: 'stop_position',
			name
		});
		restart(this);
	}
);

Given(
	/^TfL says the (\S+) to (.+) is due at "([^"]+)" in (\d+) minutes$/,
	function (this: NarratorWorld, line: string, to: string, naptan: string, minutes: string) {
		const s = state(this);
		s.arrivals = {
			naptan,
			arrivals: [
				{
					id: 'x1',
					lineName: line,
					destinationName: to,
					timeToStation: Number(minutes) * 60,
					modeName: 'bus'
				}
			]
		};
	}
);

Then('the reader can hear departures from {string}', function (this: NarratorWorld, name: string) {
	assert.ok(
		state(this)
			.game!.transitHere()
			.some((t) => t.name === name),
		JSON.stringify(state(this).game!.transitHere())
	);
});

Then('the departures say {string}', function (this: NarratorWorld, words: string) {
	const s = state(this);
	const stop = s.game!.transitHere().find((t) => t.naptan === s.arrivals?.naptan)!;
	const facts = arrivalFacts(s.arrivals!.arrivals, stop.name, '2026-10-24T12:00:00Z');
	assert.deepEqual(s.game!.departures(stop, facts)?.lines, [words]);
});

Then('the departures say nothing', function (this: NarratorWorld) {
	const s = state(this);
	for (const stop of s.game!.transitHere())
		assert.equal(s.game!.departures(stop, undefined), undefined);
});

Given('chance favours memory', function (this: NarratorWorld) {
	state(this).game!.chance = () => 0;
});

Given('chance does not favour memory', function (this: NarratorWorld) {
	state(this).game!.chance = () => 0.99;
});

When(
	/^the reader walks (east|west) (\d+) times?$/,
	function (this: NarratorWorld, way: string, times: string) {
		const s = state(this);
		const said: string[] = [];
		for (let i = 0; i < Number(times); i++) {
			const reply = s.game!.respond(way);
			said.push(replyText(reply));
		}
		s.reply = { lines: said };
	}
);

Then(
	'what it says of “ld Invented Mill” gives no street and no number',
	function (this: NarratorWorld) {
		const lines = state(this).reply!.lines.join('\n').split('\n');
		const recalled = lines.filter((l) => l.includes('ld Invented Mill'));
		assert.ok(recalled.length, 'nothing recalled');
		for (const line of recalled) assert.ok(!/Long Street|\d/.test(line), line);
	}
);

Given('the reader opens the game', function (this: NarratorWorld) {
	const s = state(this);
	s.game = new Adventure(
		compileWorld(this.narrator, junctionId(s.streetStart!), { asOf: this.snapshotDate })
	);
	const replies = s.game.begin(s.now);
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

const SAID = /(They say|It is said that|Someone wrote down that|Word is) /;

Then('it says, as hearsay, {string}', function (this: NarratorWorld, words: string) {
	const text = replyText(state(this).reply);
	assert.ok(
		new RegExp(SAID.source + words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(text),
		text
	);
});

Then('it gives it as hearsay, never as another account', function (this: NarratorWorld) {
	const text = replyText(state(this).reply);
	assert.match(text, /they say|it is said|someone wrote down|word is/i);
	assert.doesNotMatch(text, /another account/i);
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

Then('it links to Google Maps at where the map puts the reader', function (this: NarratorWorld) {
	const s = state(this);
	const [lat, lon] = this.narrator.graph.get(s.game!.here)!.position.map((n) => n.toFixed(5));
	assert.equal(
		s.reply?.link?.href,
		`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`
	);
});
