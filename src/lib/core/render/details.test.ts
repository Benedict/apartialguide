import { describe, expect, it } from 'vitest';
import { mapWords } from './adventure';

/** What the map says of a thing, in one string, to look for a sentence in. */
const said = (tags: Record<string, string>) => mapWords(tags).join(' ');

// Invented things, each with the tags a mapper gives them. No real place.
describe('what the map says of a thing, beyond its kind and name', () => {
	it('reads the words on a thing as they are, each line apart', () => {
		expect(said({ historic: 'boundary_stone', inscription: 'INVENTA\nPARISH 1861' })).toContain(
			'On it: “INVENTA”, “PARISH 1861”.'
		);
	});

	it('gives the note a mapper left on it, as the map’s', () => {
		expect(said({ man_made: 'marker', description: 'Joint bay for an invented cable.' })).toContain(
			'The map notes: “Joint bay for an invented cable.”'
		);
	});

	it('leaves out a note that carries a technical value or runs long, as it may not be cut', () => {
		expect(
			said({ man_made: 'marker', description: 'Joint bay for an invented 400kV circuit.' })
		).not.toContain('The map notes');
		expect(
			said({ shop: 'hairdresser', description: 'Inventa Salon is '.padEnd(180, 'a') })
		).not.toContain('The map notes');
		expect(said({ boundary: 'marker', description: 'County border 1889-1965' })).toContain(
			'The map notes: “County border 1889-1965”.'
		);
	});

	it('gives its other names, each as found', () => {
		const words = said({
			railway: 'rail',
			name: 'Inventa Line',
			alt_name: 'Inventa Branch',
			official_name: 'Inventa Junction to Nowhere Line',
			short_name: 'The Inventa',
			'name:fa': 'اینونتا',
			'tunnel:name': 'Inventa Tunnel'
		});
		expect(words).toContain('Also called “Inventa Branch”.');
		expect(words).toContain('Officially “Inventa Junction to Nowhere Line”.');
		expect(words).toContain('“The Inventa” for short.');
		expect(words).toContain('In Persian, “اینونتا”.');
		expect(words).toContain('The tunnel is “Inventa Tunnel”.');
	});

	it('gives a post box its cypher as found, never the reign it stands for', () => {
		const words = said({ amenity: 'post_box', royal_cypher: 'GR' });
		expect(words).toContain('It bears the cypher “GR”.');
		expect(words).not.toMatch(/George|King/);
	});

	it('gives the date a thing is given, as precisely as it is given, and its listing', () => {
		expect(said({ building: 'church', start_date: '1882' })).toContain(
			'Its date is given as 1882.'
		);
		expect(said({ building: 'church', start_date: '1882-05-29' })).toContain(
			'Its date is given as 29 May 1882.'
		);
		expect(said({ building: 'church', listed_status: 'Grade II*' })).toContain(
			'It is listed, Grade II*.'
		);
	});

	it('gives a tree its species as found, common name first, and a wood its leaves', () => {
		expect(
			said({ natural: 'tree', species: 'Ginkgo biloba', 'species:en': 'Maidenhair tree' })
		).toContain('Its species is given as Maidenhair tree, “Ginkgo biloba”.');
		expect(said({ natural: 'tree', genus: 'Prunus' })).toContain('Its genus is given as “Prunus”.');
		expect(said({ natural: 'wood', leaf_type: 'broadleaved', leaf_cycle: 'deciduous' })).toContain(
			'Broadleaved, deciduous.'
		);
	});

	it('says what a ground is for', () => {
		expect(said({ leisure: 'pitch', sport: 'tennis;bowls' })).toContain('For tennis and bowls.');
	});

	it('gives a public footpath its designation and reference', () => {
		expect(
			said({ highway: 'footway', designation: 'public_footpath', prow_ref: 'Inventa FP 12' })
		).toContain('A public footpath, “Inventa FP 12”.');
	});

	it('says a way runs on a bridge or in a tunnel, and counts steps given', () => {
		expect(said({ highway: 'footway', bridge: 'yes' })).toContain('It runs on a bridge.');
		expect(said({ railway: 'rail', bridge: 'viaduct' })).toContain('It runs on a viaduct.');
		expect(said({ waterway: 'stream', tunnel: 'culvert' })).toContain('It runs in a culvert.');
		expect(said({ highway: 'steps', step_count: '6' })).toContain('It has 6 steps.');
	});

	it('gives a board its subject and a work of art its kind', () => {
		expect(said({ tourism: 'information', information: 'board', board_type: 'history' })).toContain(
			'Its subject is given as history.'
		);
		expect(said({ tourism: 'artwork', artwork_type: 'mural' })).toContain('It is a mural.');
	});

	it('gives a boundary marker the counties either side', () => {
		expect(
			said({ boundary: 'marker', 'left:county': 'Inventashire', 'right:county': 'Elsewhere' })
		).toContain('Inventashire on one side, Elsewhere on the other.');
	});

	it('leaves technical values unsaid', () => {
		const words = said({
			power: 'generator',
			'generator:output:electricity': '12 kW',
			voltage: '400000',
			roof: 'yes',
			'roof:shape': 'hipped'
		});
		expect(words).not.toMatch(/12 kW|400000|hipped/);
	});
});
