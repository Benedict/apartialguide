import { describe, expect, it } from 'vitest';
import { Adventure } from '../core/adventure/engine';
import { romanWorld, type RomanLayers } from './world';

// Invented country. Inventa Way runs north from Inventon past a fork to Fortham; at the fork a lane
// leaves east for Stonebury. A wall runs west from Inventon to two milecastles.
type P = Record<string, unknown>;
const line = (props: P, coords: number[][]) => ({
	properties: props,
	geometry: { type: 'LineString', coordinates: coords }
});
const point = (props: P, lon: number, lat: number) => ({
	properties: props,
	geometry: { type: 'Point', coordinates: [lon, lat] }
});
const layers: RomanLayers = {
	roads: {
		features: [
			line({ 'Road - Start and End': 'Inventa Way', 'Segment Confidence': 3 }, [
				[0, 51],
				[0, 51.03]
			]),
			line({ 'Road - Start and End': 'Inventa Way', 'Segment Confidence': 1 }, [
				[0, 51.03],
				[0, 51.05],
				[0, 51.1]
			]),
			line(
				{
					'Road - Start and End': 'Eastward Lane?',
					'Road name (if any)': 'The Lane',
					'Segment Confidence': 2
				},
				[
					[0, 51.05],
					[0.1, 51.05]
				]
			)
		]
	},
	walls: {
		features: [
			line({ Feature: 'Invented Wall' }, [
				[0, 51],
				[-0.03, 51],
				[-0.06, 51]
			]),
			line({ Feature: 'Invented Wall Ditch' }, [
				[0, 51.001],
				[-0.06, 51.001]
			])
		]
	},
	settlement: {
		features: [
			point(
				{
					SITE_NAME: 'Inventon',
					'ROMAN NAME': 'INVENTVM?',
					TYPE: 'Vicus - large  >9Ha',
					'Historic County': 'Testshire'
				},
				0,
				51
			)
		]
	},
	military: {
		features: [
			point(
				{
					'Modern Name': 'Fortham',
					'Main site type': 'Fort',
					'Type - Flavian AD69-96': 'Fort',
					'Type - 4th Century': 'Fortlet',
					'Historic County': 'Otherland'
				},
				0.002,
				51.1
			)
		]
	},
	milestones: {
		features: [
			point(
				{
					'Site name': 'Stonebury',
					Inscription: 'IMP CAES',
					'Inscription Translation': 'For the Emperor Caesar'
				},
				0.1,
				51.05
			)
		]
	},
	milecastles: {
		features: [
			point(
				{
					'MC_No.': 1,
					Site_name: 'Inventhaugh',
					Status: 'Assumed',
					Condition: 'Destroyed',
					Type: 'Short Axis',
					Account: 'Stones were taken in the 18th century (Simp'
				},
				-0.03,
				51
			),
			point({ 'MC_No.': 2, Site_name: 'Farhaugh', Status: 'Known' }, -0.06, 51)
		]
	}
};
const confidence = { '3': 'Certain - +/- 30m', '2': 'Probable +/- 200m', '1': 'Conjectured' };

describe('romanWorld (Roman sites as a walk, stage by stage)', () => {
	const world = romanWorld(layers, { confidence, start: 'Inventon' });
	const at = (title: string) => Object.values(world.stops).find((s) => s.title === title)!;
	const ways = (title: string) => at(title).paragraphs.at(-1)!;

	it('makes a place of each site alone: a fork on the road is passed, not stopped at', () => {
		expect(
			Object.values(world.stops)
				.map((s) => s.title)
				.sort()
		).toEqual(
			[
				'Fortham',
				'Inventon',
				'Milecastle 1, Inventhaugh',
				'Milecastle 2, Farhaugh',
				'Stonebury'
			].sort()
		);
		expect(world.stops[world.start].title).toBe('Inventon');
		expect(world.ways).toBe('Ways');
	});

	it('leads from a site to the next sites, the way past the fork going on to both', () => {
		const exits = at('Inventon')
			.exits.map((e) => world.stops[e.to].title)
			.sort();
		expect(exits).toEqual(['Fortham', 'Milecastle 1, Inventhaugh', 'Stonebury'].sort());
	});

	it('tells each stage where it goes, how far, and how its certainty changes on the way', () => {
		expect(ways('Inventon')).toMatch(/^Ways: /);
		expect(ways('Inventon')).toContain(
			'north, 11 km to Fortham, into Otherland: “Inventa Way”, Certain - +/- 30m for 3.3 km, then Conjectured for 7.8 km'
		);
		expect(ways('Inventon')).toContain(
			'“Inventa Way”, Certain - +/- 30m for 3.3 km, then Conjectured for 2.2 km; then “Eastward Lane?” (“The Lane”), Probable +/- 200m for 7.0 km'
		);
	});

	it('walks the wall, milecastle to milecastle', () => {
		expect(ways('Milecastle 1, Inventhaugh')).toContain(
			'west, 2.1 km to Milecastle 2, Farhaugh: “Invented Wall”'
		);
	});

	it('tells a milecastle as kept, its account as found, cut short or not', () => {
		const text = at('Milecastle 1, Inventhaugh').paragraphs.join(' ');
		expect(text).toContain('Assumed');
		expect(text).toContain('Destroyed');
		expect(text).toContain('Short Axis');
		expect(text).toContain('Someone wrote: “Stones were taken in the 18th century (Simp”.');
	});

	it('tells the site as kept, its Roman name as hearsay, and a county only where a stage crosses into one', () => {
		const text = at('Inventon').paragraphs[0];
		expect(text).toContain('Inventon: Vicus - large  >9Ha.');
		expect(text).toContain('It is said it was called “INVENTVM?”.');
		expect(text).not.toContain('Testshire');
		expect(ways('Inventon')).toContain('to Fortham, into Otherland');
	});

	it('says nothing twice at one place, though two sites there are kept under one name', () => {
		const twice = romanWorld(
			{
				...layers,
				military: {
					features: [
						...layers.military!.features,
						{
							properties: {
								'Modern Name': 'Inventon fort',
								'Main site type': 'Fort',
								'Roman name (if known)': 'INVENTVM?'
							},
							geometry: { type: 'Point', coordinates: [0.001, 51] }
						}
					]
				}
			},
			{ confidence, start: 'Inventon' }
		);
		const text = Object.values(twice.stops).find((x) => x.title === 'Inventon')!.paragraphs[0];
		expect(text.split('It is said it was called “INVENTVM?”.').length - 1).toBe(1);
		expect(text).toContain('Inventon fort: Fort.');
	});

	it('gives a fort its kind in each age kept, and a milestone its words as they are', () => {
		expect(at('Fortham').paragraphs.join(' ')).toContain(
			'Flavian AD69-96: Fort; 4th Century: Fortlet'
		);
		const stone = at('Stonebury').paragraphs.join(' ');
		expect(stone).toContain('On it: “IMP CAES”.');
		expect(stone).toContain('Someone wrote down that it means “For the Emperor Caesar”.');
	});

	it('puts every place where the data puts it', () => {
		expect(at('Inventon').at).toEqual([51, 0]);
	});

	it('does not say again, walking on, what was heard at the last place', () => {
		const same = { Status: 'Assumed', Condition: 'Destroyed' };
		const twins = romanWorld(
			{
				walls: layers.walls,
				milecastles: {
					features: [
						point({ 'MC_No.': 1, Site_name: 'Inventhaugh', ...same }, -0.03, 51),
						point({ 'MC_No.': 2, Site_name: 'Farhaugh', ...same }, -0.06, 51)
					]
				}
			},
			{ confidence, start: 'Milecastle 1, Inventhaugh' }
		);
		const game = new Adventure(twins);
		game.begin();
		expect(game.respond('take the tour').lines.join(' ')).toContain(
			'Status: Assumed; Condition: Destroyed.'
		);
		const next = game.respond('west').lines.join(' ');
		expect(next).toContain('Milecastle 2, Farhaugh: a milecastle.');
		expect(next).not.toContain('Status: Assumed');
		expect(next).toContain('Ways:');
	});

	it('tells a milecastle’s whole account where WallCAP keeps it, and its history on a closer look', () => {
		const whole = romanWorld(layers, {
			confidence,
			start: 'Inventon',
			accounts: {
				1: {
					account:
						'Stones were taken in the 18th century (Simpson, 1975), and it is probable nothing remains.',
					history: ['Surveyed by an antiquary.', 'A kiln was built over it in 1885.']
				}
			}
		});
		const mc = Object.values(whole.stops).find((x) => x.title === 'Milecastle 1, Inventhaugh')!;
		expect(mc.paragraphs[0]).toContain(
			'Someone wrote: “Stones were taken in the 18th century (Simpson, 1975), and it is probable nothing remains.”'
		);
		expect(mc.paragraphs[0]).not.toContain('(Simp”');
		expect(mc.paragraphs[0]).toContain('More is written of it, for a closer look.');
		const game = new Adventure({
			...whole,
			start: Object.keys(whole.stops).find((k) => whole.stops[k] === mc)!
		});
		game.begin();
		game.respond('take the tour');
		const looked = game.respond('examine milecastle').lines.join(' ');
		expect(looked).toContain('Surveyed by an antiquary.');
		expect(looked).toContain('A kiln was built over it in 1885.');
	});
});
