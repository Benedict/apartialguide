import { describe, expect, it } from 'vitest';
import { packWorld, unpackWorld } from './packed';
import type { AdventureWorld } from './world';
import type { Thing } from '../render/renderer';

// An invented corner: the same shop seen from two stops, as neighbours see one thing.
const shop: Thing = {
	id: 'node/1',
	name: 'The Sextant',
	aliases: ['sextant', 'pub'],
	description: 'A pub, “The Sextant”.'
};
const street: Thing = {
	id: 'way/2',
	name: 'Long Street',
	aliases: ['long', 'street'],
	description: 'A street.',
	background: true
};

const world: AdventureWorld = {
	start: 'a',
	asOf: '2026-01-01',
	stops: {
		a: {
			title: 'Long Street',
			paragraphs: [
				'You are standing on Long Street. Asphalt underfoot.',
				'Exits: east (Long Street).'
			],
			parts: [
				[
					{
						kind: 'where',
						text: 'You are standing on Long Street.',
						key: 'You are standing on Long Street.',
						street: 'Long Street'
					},
					{ kind: 'setting', text: 'Asphalt underfoot.', key: 'asphalt' }
				],
				[{ kind: 'exits', text: 'Exits: east (Long Street).', key: 'Exits: east (Long Street).' }]
			],
			exits: [{ label: 'east', to: 'b', street: 'Long Street' }],
			things: [shop],
			streets: [street],
			hidden: { lines: ['Looking closer, you find The Sextant.'], things: [shop] }
		},
		b: {
			title: 'Long Street',
			paragraphs: ['Long Street, and a pub.', 'Exits: west (Long Street).'],
			parts: [
				[{ kind: 'prose', text: 'Long Street, and a pub.', key: 'Long Street, and a pub.' }],
				[{ kind: 'exits', text: 'Exits: west (Long Street).', key: 'Exits: west (Long Street).' }]
			],
			plain: {
				paragraphs: ['Further along Long Street.'],
				parts: [
					[{ kind: 'where', text: 'Further along Long Street.', key: 'Further along Long Street.' }]
				]
			},
			exits: [{ label: 'west', to: 'a', street: 'Long Street' }],
			things: [shop, { ...shop, background: true }],
			streets: [street]
		},
		c: {
			title: 'Short Row',
			// Paragraphs the parts do not spell out are carried as they are.
			paragraphs: ['Short Row.'],
			parts: [[{ kind: 'where', text: 'Short Row, here.', key: 'Short Row, here.' }]],
			exits: [],
			things: []
		}
	}
};

describe('packWorld', () => {
	it('opens again as the same world', () => {
		expect(unpackWorld(JSON.parse(JSON.stringify(packWorld(world))))).toEqual(world);
	});

	it('carries each thing once, however many stops see it', () => {
		const packed = packWorld(world);
		expect(packed.things).toHaveLength(3);
		expect(JSON.stringify(packed).match(/The Sextant”/g)).toHaveLength(2);
	});

	it('leaves out paragraphs its parts spell out, and keys that repeat the text', () => {
		const packed = packWorld(world);
		expect(packed.stops.a.paragraphs).toBeUndefined();
		expect(packed.stops.c.paragraphs).toEqual(['Short Row.']);
		expect(JSON.stringify(packed)).not.toContain('"key":"You are standing');
		expect(JSON.stringify(packed)).toContain('"key":"asphalt"');
	});
});
