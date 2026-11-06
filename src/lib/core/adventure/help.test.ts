import { describe, expect, it } from 'vitest';
import { Adventure, HELP } from './engine';
import type { AdventureWorld } from './world';

// An invented place of one stop: no real place.
const world: AdventureWorld = {
	start: 'a',
	stops: {
		a: { title: 'Invented Lane', paragraphs: ['You are on Invented Lane.'], exits: [], things: [] }
	}
};

describe('help', () => {
	it('says, in the page’s voice, what the walk uses and where to ask for something to be taken out', () => {
		const game = new Adventure(world);
		game.removal = { email: 'remove@example.org', page: '/remove/' };
		const reply = game.respond('help');
		expect(reply.lines).toEqual([HELP]);
		expect(reply.hint).toContain('open data');
		expect(reply.hint).toContain('remove@example.org');
		expect(reply.hint).toContain('/remove/');
	});

	it('gives the address alone where there is no page for it', () => {
		const game = new Adventure(world);
		game.removal = { email: 'remove@example.org' };
		expect(game.respond('help').hint).toContain('remove@example.org');
	});

	it('says nothing of removal where the page has nowhere to send it', () => {
		expect(new Adventure(world).respond('help').hint).toBeUndefined();
	});
});
