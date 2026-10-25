import { Given, When } from '@cucumber/cucumber';
import { Adventure } from '../../src/lib/core/adventure/engine';
import { compileWorld } from '../../src/lib/core/adventure/world';
import type { AreaRecord } from '../../src/lib/core/areas';
import { destination, type LatLon } from '../../src/lib/core/geo';
import type { NarratorWorld } from '../support/world';

type State = NarratorWorld & {
	game?: Adventure;
	started?: string;
	streetStart?: number;
	reply?: { lines: string[] };
};

/** A box, as a ring, from a western to an eastern longitude, well beyond the street north and south. */
const box = (here: LatLon, west: number, east: number): LatLon[] => [
	[here[0] - 0.01, west],
	[here[0] - 0.01, east],
	[here[0] + 0.01, east],
	[here[0] + 0.01, west],
	[here[0] - 0.01, west]
];

function withWards(world: NarratorWorld, wards: AreaRecord[]) {
	const s = world as State;
	world.records = [
		{
			source: 'Invented Boundaries',
			prefix: 'ward',
			retrieved: '2026-10-24',
			records: [],
			areas: wards
		}
	];
	world.rebuild();
	s.game = new Adventure(compileWorld(world.narrator, s.started!));
}

const ward = (name: string, ring: LatLon[]): AreaRecord => ({
	id: name.toLowerCase().replace(/\W+/g, '-'),
	name,
	kind: 'ward',
	rings: [ring]
});

Given(
	'a ward called {string} west of just beyond the reader, and {string} east of it',
	function (this: NarratorWorld, west: string, east: string) {
		const here = this.narrator.graph.get((this as State).started!)!.position;
		const edge = destination(here, 90, 10)[1];
		withWards(this, [
			ward(west, box(here, here[1] - 0.01, edge)),
			ward(east, box(here, edge, here[1] + 0.01))
		]);
	}
);

Given(
	'a ward called {string} west of just beyond the reader, and none east of it',
	function (this: NarratorWorld, west: string) {
		const here = this.narrator.graph.get((this as State).started!)!.position;
		const edge = destination(here, 90, 10)[1];
		withWards(this, [ward(west, box(here, here[1] - 0.01, edge))]);
	}
);

Given('a ward called {string} all along Long Street', function (this: NarratorWorld, name: string) {
	const here = this.narrator.graph.get((this as State).started!)!.position;
	withWards(this, [ward(name, box(here, here[1] - 0.01, here[1] + 0.01))]);
});

When('the reader takes the tour from part way along Long Street', function (this: NarratorWorld) {
	const s = this as State;
	s.game = new Adventure(compileWorld(this.narrator, s.started!));
	s.game.begin();
	s.reply = s.game.respond('take the tour');
});
