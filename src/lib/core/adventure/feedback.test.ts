import { describe, expect, it } from 'vitest';
import { Adventure } from './engine';
import { parse } from './parser';
import type { AdventureWorld } from './world';

// An invented street of two stops: no real place.
const world: AdventureWorld = {
	start: 'a',
	asOf: '2026-10-29',
	stops: {
		a: {
			title: 'Invented Lane',
			paragraphs: ['You are standing on Invented Lane.'],
			exits: [{ label: 'east', to: 'b', street: 'Invented Lane' }],
			things: []
		},
		b: {
			title: 'Invented Lane, east',
			paragraphs: ['Further along Invented Lane.'],
			exits: [{ label: 'west', to: 'a', street: 'Invented Lane' }],
			things: []
		}
	}
};

function walker(open = true) {
	const game = new Adventure(world);
	game.feedbackOpen = open;
	game.context = { device: 'phone', browser: 'Safari' };
	game.begin();
	game.respond('take the tour');
	game.respond('east');
	return game;
}

describe('feedback', () => {
	it('reads its words', () => {
		for (const words of ['feedback', 'give feedback', 'send feedback', 'report a bug'])
			expect(parse(words)).toEqual({ verb: 'feedback' });
	});

	it('asks what kind of feedback it is, as the page and not as Guide, offering each as a button', () => {
		const reply = walker().respond('feedback');
		expect(reply.lines).toEqual([]);
		expect(reply.hint).toBe('Is it a bug, an idea or a comment?');
		expect(reply.actions?.map((a) => a.command)).toEqual(['bug', 'idea', 'comment', 'cancel']);
	});

	it('then asks whether the reader would walk again, then for their own words', () => {
		const game = walker();
		game.respond('feedback');
		const again = game.respond('idea');
		expect(again.hint).toBe('Would you walk here again?');
		expect(again.actions?.map((a) => a.command)).toEqual(['yes', 'maybe', 'no', 'cancel']);
		expect(game.respond('maybe').hint).toBe('Write it in your own words, then press return.');
	});

	it('asks again, rather than guessing, when an answer is not one it offered', () => {
		const game = walker();
		game.respond('feedback');
		expect(game.respond('north').hint).toBe('Is it a bug, an idea or a comment?');
		expect(game.here).toBe('b');
	});

	it('shows everything it would send, and sends nothing until the reader says yes', () => {
		const game = walker();
		game.respond('feedback');
		game.respond('bug');
		game.respond('yes');
		const shown = game.respond('The map stops at the lane.');
		expect(shown.send).toBeUndefined();
		expect(shown.lines).toEqual([
			'Kind: a bug.',
			'Would walk again: yes.',
			'Your words: “The map stops at the lane.”',
			'Where: Invented Lane, east, after 1 move.',
			'The map: dated 29 October 2026.',
			'Your device: a phone, Safari.'
		]);
		expect(shown.hint).toBe('Send it?');
		expect(shown.actions?.map((a) => a.command)).toEqual(['yes', 'no']);
		const sent = game.respond('yes');
		expect(sent.send).toEqual({
			kind: 'bug',
			again: 'yes',
			words: 'The map stops at the lane.',
			place: 'Invented Lane, east',
			moves: 1,
			map: '2026-10-29',
			device: 'phone',
			browser: 'Safari'
		});
		expect(sent.hint).toBe('Sending…');
	});

	it('thanks the reader once it has gone, and owns it when it has not', () => {
		const game = walker();
		expect(game.sent(true).hint).toBe('Sent. Thank you.');
		expect(game.sent(false).hint).toBe('It did not go, so nothing was sent. Try again later.');
	});

	it('takes the words as they are, never as a command, and the walk goes on after', () => {
		const game = walker();
		game.respond('feedback');
		game.respond('comment');
		game.respond('no');
		expect(game.asking).toBe(true);
		const shown = game.respond('west');
		expect(shown.lines).toContain('Your words: “west”');
		expect(game.here).toBe('b');
		game.respond('yes');
		expect(game.asking).toBe(false);
		// Again repeats the last command, east, never the words, which would have walked west.
		game.respond('again');
		expect(game.here).toBe('b');
		expect(game.respond('west').title).toBe('Invented Lane');
	});

	it('asks for the words again when none are written, or too many', () => {
		const game = walker();
		game.respond('feedback');
		game.respond('comment');
		game.respond('yes');
		expect(game.respond('   ').hint).toBe('Write it in your own words, then press return.');
		expect(game.respond('x'.repeat(2001)).hint).toBe(
			'That is more than 2,000 characters. Write it shorter, then press return.'
		);
	});

	it('sends nothing when the reader cancels, or says no at the last', () => {
		const game = walker();
		game.respond('feedback');
		expect(game.respond('cancel').hint).toBe('Nothing was sent.');
		expect(game.asking).toBe(false);
		game.respond('feedback');
		game.respond('bug');
		game.respond('no');
		game.respond('Something.');
		const no = game.respond('no');
		expect(no.send).toBeUndefined();
		expect(no.hint).toBe('Nothing was sent.');
	});

	it('can be given before the walk begins, where it says the walk has not begun', () => {
		const game = new Adventure(world);
		game.feedbackOpen = true;
		game.begin();
		game.respond('feedback');
		game.respond('comment');
		game.respond('yes');
		const shown = game.respond('Hello.');
		expect(shown.lines).toContain('Where: before the walk began.');
		expect(game.respond('yes').send).toMatchObject({ moves: 0, place: '' });
	});

	it('says feedback is not open where the page has nowhere to send it', () => {
		const reply = walker(false).respond('feedback');
		expect(reply.hint).toBe('Feedback is not open on this page.');
		expect(reply.actions).toBeUndefined();
	});
});
