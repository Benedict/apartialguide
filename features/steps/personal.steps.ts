import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { Adventure } from '../../src/lib/core/adventure/engine';
import { compileWorld } from '../../src/lib/core/adventure/world';
import type { RecordStore } from '../../src/lib/core/adapters/records';
import { pruneNarration } from '../../src/lib/core/narration';
import type { NarrationStore } from '../../src/lib/core/render/cached';
import { buildPrompt, promptKey } from '../../src/lib/core/render/prompt';
import { suppressRecords, type Suppression } from '../../src/lib/core/suppression';
import { SyntheticMap } from '../../src/lib/core/testing/synthetic';
import { planningRecords, priceRecords } from '../../src/lib/server/sources/more';
import { notFoundPage } from '../../src/lib/server/notfound';
import { privacyPage } from '../../src/lib/server/privacy';
import { removalPage } from '../../src/lib/server/remove';
import type { NarratorWorld } from '../support/world';

const O = SyntheticMap.ORIGIN;
const BOX = '-1,50,1,52';
const RETRIEVED = '2026-10-25';
const EMAIL = 'remove@example.org';

interface PersonalState {
	/** Each invented street, by name: where it starts, and where each house number stands. */
	streets: Record<string, { bearing: number }>;
	/** Raw answers, as a source would give them. */
	planningHits: { _id: string; _source: Record<string, unknown> }[];
	saleBindings: Record<string, { value: string }>[];
	logged: string[];
	ingested?: ReturnType<typeof planningRecords>;
	suppressed: Suppression[];
	store: NarrationStore;
	/** Every word a reader could meet on the street, and every prompt the model would be sent. */
	told?: string;
	prompts?: string;
	pages: string[];
}
const state = (w: NarratorWorld) => {
	const s = w as NarratorWorld & Partial<PersonalState>;
	s.streets ??= {};
	s.planningHits ??= [];
	s.saleBindings ??= [];
	s.logged ??= [];
	s.suppressed ??= [];
	s.store ??= {};
	s.pages ??= [];
	return s as NarratorWorld & PersonalState;
};

Given(
	'an invented street called {string} with houses numbered {int} to {int}',
	function (this: NarratorWorld, name: string, from: number, to: number) {
		const s = state(this);
		// Each street runs its own way from the origin, so two never meet but there.
		const bearing = Object.keys(s.streets).length ? 180 : 90;
		const start = this.map.node(O);
		this.map.way([start, this.map.nodeFrom(O, bearing, 300)], { highway: 'residential', name });
		for (let n = from, i = 0; n <= to; n += 2, i++) {
			const along = this.map.position(this.map.nodeFrom(O, bearing, 40 + i * 30));
			this.map.node(this.map.position(this.map.nodeFrom(along, bearing - 90, 12)), {
				building: 'house',
				'addr:housenumber': String(n),
				'addr:street': name
			});
		}
		s.streets[name] = { bearing };
		this.rebuild();
	}
);

const hit = (id: string, source: Record<string, unknown>) => ({
	_id: id,
	_source: {
		lpa_app_no: id,
		site_number: '12',
		street_name: 'Example Road',
		decision_date: '2024-05-01',
		...source
	}
});

Given(
	'a planning application with applicant {string} at 12 Example Road',
	function (this: NarratorWorld, applicant: string) {
		state(this).planningHits.push(
			hit('24/9', {
				description: 'Single storey rear extension',
				applicant_name: applicant,
				agent_name: 'Invented Agents Ltd',
				applicant_address: '12 Example Road'
			})
		);
	}
);

Given(
	'a planning application {string} at 12 Example Road',
	function (this: NarratorWorld, description: string) {
		state(this).planningHits.push(hit('24/12', { description }));
	}
);

Given('a planning description {string}', function (this: NarratorWorld, description: string) {
	state(this).planningHits.push(hit('24/10', { description }));
});

const sale = (number: string, street: string, amount: number, date: string) => ({
	paon: { value: number },
	street: { value: street.toUpperCase() },
	amount: { value: String(amount) },
	date: { value: date }
});

Given(
	'Example Road has 8 sales since 2020, including 12 Example Road for £482,500',
	function (this: NarratorWorld) {
		const amounts = [401_000, 433_000, 482_500, 459_000, 512_000, 538_000, 470_000, 449_000];
		['2', '4', '12', '6', '8', '10', '14', '16'].forEach((n, i) =>
			state(this).saleBindings.push(
				sale(n, 'Example Road', amounts[i], `${2020 + (i % 6)}-0${1 + (i % 8)}-01`)
			)
		);
	}
);

Given('Quiet Close has 3 sales since 2020', function (this: NarratorWorld) {
	['1', '3', '5'].forEach((n, i) =>
		state(this).saleBindings.push(sale(n, 'Quiet Close', 300_000 + i * 10_000, `202${i + 1}-03-01`))
	);
});

Given(
	"12 Example Road's planning record is on the suppression list",
	function (this: NarratorWorld) {
		state(this).suppressed.push({ source: 'planning', id: '24/12', asked: '2026-11-06' });
	}
);

/** What every source gives now, taken in as a fetch would, with the suppression list applied. */
function ingest(world: NarratorWorld) {
	const s = state(world);
	const stores: RecordStore[] = [
		{
			source: 'London Planning Datahub',
			prefix: 'planning',
			retrieved: RETRIEVED,
			records: planningRecords({ hits: { hits: s.planningHits } }, BOX, (l) => s.logged.push(l))
		},
		{
			source: 'HM Land Registry',
			prefix: 'price',
			retrieved: RETRIEVED,
			records: priceRecords({ results: { bindings: s.saleBindings } }, RETRIEVED)
		}
	];
	world.records = suppressRecords(stores, s.suppressed);
	world.rebuild();
}

When('the record is ingested', function (this: NarratorWorld) {
	const s = state(this);
	s.ingested = planningRecords({ hits: { hits: s.planningHits } }, BOX, (l) => s.logged.push(l));
});

When('the data is refreshed from source', function (this: NarratorWorld) {
	ingest(this);
});

Given(
	'prose was written for Example Road while that record was told',
	function (this: NarratorWorld) {
		ingest(this);
		const s = state(this);
		for (const stop of this.narrator.graph.all()) {
			const prompt = buildPrompt(this.narrator.visit(stop.id)!.scene);
			// Prose for the places whose facts held the record, as the model was sent them.
			if (!prompt.user.includes('Invented garden room')) continue;
			s.store[promptKey(prompt)] = {
				paragraphs: ['At 12, an application: “Invented garden room”.'],
				model: 'test',
				written: '2026-11-01'
			};
		}
		assert.ok(JSON.stringify(s.store).includes('Invented garden room'));
	}
);

When(
	/^the Guide narrates (Example Road|Quiet Close)$/,
	function (this: NarratorWorld, name: string) {
		const s = state(this);
		if (!this.records.length || s.suppressed.length === 0) ingest(this);
		const narrator = this.narrator;
		const world = compileWorld(narrator, narrator.graph.all()[0].id);
		const onStreet = Object.values(world.stops).filter((stop) =>
			[stop.title, ...stop.paragraphs].join(' ').includes(name)
		);
		assert.ok(onStreet.length, `no stop on ${name}`);
		s.told = onStreet
			.flatMap((stop) => [
				stop.title,
				...stop.paragraphs,
				...stop.things.map((t) => t.description),
				...(stop.streets ?? []).map((t) => t.description),
				...(stop.hidden?.lines ?? []),
				...(stop.hidden?.things ?? []).map((t) => t.description)
			])
			.join('\n');
		s.prompts = narrator.graph
			.all()
			.map((stop) => {
				const { system, user } = buildPrompt(narrator.visit(stop.id)!.scene);
				return `${system}\n${user}`;
			})
			.join('\n');
	}
);

Then('the narration does not contain {string}', function (this: NarratorWorld, words: string) {
	const s = state(this);
	assert.ok(!s.told!.includes(words), s.told);
	assert.ok(!s.prompts!.includes(words));
});

Then(
	'the data sent to the LLM contains no applicant or agent fields',
	function (this: NarratorWorld) {
		const s = state(this);
		assert.doesNotMatch(s.prompts!, /Smith|Invented Agents|applicant|agent/i);
		const keys = this.records.flatMap((store) =>
			store.records.flatMap((r) => Object.keys(r.claims))
		);
		assert.ok(!keys.some((k) => /applicant|agent/i.test(k)), keys.join(', '));
		// The application itself is still told, by its own words.
		assert.ok(s.told!.includes('Single storey rear extension'), s.told);
	}
);

Then('the stored description is {string}', function (this: NarratorWorld, words: string) {
	assert.equal(state(this).ingested![0].claims.application, words);
});

Then('the removal is logged', function (this: NarratorWorld) {
	const s = state(this);
	assert.equal(s.logged.length, 1);
	assert.match(s.logged[0], /24\/10/);
	assert.doesNotMatch(s.logged[0], /Jones/);
});

const SOLD = /[^.\n]*\bsold\b[^.\n]*\./gi;

Then('the narration does not link any sale to a house number', function (this: NarratorWorld) {
	const s = state(this);
	const sayings = s.told!.match(SOLD) ?? [];
	assert.ok(sayings.length, s.told);
	for (const said of sayings) assert.doesNotMatch(said, /\b(1[0-6]|[2-9]) Example Road\b|\bat \d/);
	assert.doesNotMatch(s.prompts!, /sold/i);
});

Then('the narration gives a range rounded to the nearest £25,000', function (this: NarratorWorld) {
	const match = state(this).told!.match(/between £([\d,]+) and £([\d,]+) since 2020/);
	assert.ok(match, state(this).told);
	const [low, high] = [match[1], match[2]].map((n) => Number(n.replace(/,/g, '')));
	assert.equal(low % 25_000, 0);
	assert.equal(high % 25_000, 0);
	assert.deepEqual([low, high], [400_000, 550_000]);
});

Then('the narration does not mention sale prices', function (this: NarratorWorld) {
	const s = state(this);
	assert.doesNotMatch(s.told!, /sold|£/i);
	assert.doesNotMatch(s.prompts!, /sold|£/i);
});

Then('that planning record is not narrated', function (this: NarratorWorld) {
	const s = state(this);
	assert.ok(!s.told!.includes('Invented garden room'), s.told);
	assert.ok(!s.prompts!.includes('Invented garden room'));
});

Then('no cached narration for it remains', function (this: NarratorWorld) {
	const s = state(this);
	pruneNarration(this.narrator, s.store);
	assert.ok(!JSON.stringify(s.store).includes('Invented garden room'));
});

Given('a player on any page', function (this: NarratorWorld) {
	state(this).pages = [
		privacyPage({ removal: EMAIL }),
		notFoundPage(),
		removalPage({ email: EMAIL })
	];
});

When(
	'they open {string} from the footer or type {string}',
	function (this: NarratorWorld, link: string, command: string) {
		const s = state(this);
		for (const page of s.pages.slice(0, 2)) assert.ok(page.includes('href="/remove/"'), link);
		const game = new Adventure({
			start: 'a',
			stops: { a: { title: 'Invented Lane', paragraphs: [], exits: [], things: [] } }
		});
		game.removal = { email: EMAIL, page: '/remove/' };
		s.told = [game.respond(command).hint ?? '', s.pages[2]].join('\n');
	}
);

Then(
	'they see what data is used, where it comes from, and the removal email address',
	function (this: NarratorWorld) {
		const told = state(this).told!;
		assert.match(told, /open data/);
		for (const source of ['OpenStreetMap', 'London Planning Datahub', 'HM Land Registry'])
			assert.ok(told.includes(source), source);
		assert.ok(told.includes(`mailto:${EMAIL}`));
		assert.ok(told.split('\n')[0].includes(EMAIL));
	}
);
