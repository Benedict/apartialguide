import { longDate } from '../render/words';

/**
 * Feedback, asked in the page's own voice and not Guide's: what kind it is, whether the reader would
 * walk again, and their own words; then everything that would be sent is shown, and nothing is sent
 * until the reader says yes. The words are taken as they are, never as a command, and never counted.
 * What is sent beside them is only what is shown: the place in the walk, the moves, the map's date,
 * and the kind of device and browser. Never where the reader is.
 */
export const KINDS = ['bug', 'idea', 'comment'] as const;
export const AGAIN = ['yes', 'maybe', 'no'] as const;
export const DEVICES = ['phone', 'tablet', 'desktop'] as const;
export const BROWSERS = [
	'Chrome',
	'Edge',
	'Firefox',
	'Safari',
	'Samsung Internet',
	'Other'
] as const;
/** The most the reader's words may run to. */
export const MOST_WORDS = 2000;

export type Kind = (typeof KINDS)[number];
export type Again = (typeof AGAIN)[number];

/** What the page knows of the reader's device: its kind and browser family, nothing finer. */
export interface FeedbackContext {
	device?: (typeof DEVICES)[number];
	browser?: (typeof BROWSERS)[number];
}

/** Feedback as it is sent. */
export interface Feedback extends FeedbackContext {
	kind: Kind;
	again: Again;
	words: string;
	/** The place the walk stood, or empty before it began. */
	place: string;
	moves: number;
	/** The map's date. */
	map?: string;
}

/** Where the walk stands as the reader gives feedback, from the engine. */
export interface FeedbackAbout extends FeedbackContext {
	place: string;
	moves: number;
	map?: string;
}

/** A reply of the form's: the page's words, buttons, and, at the last, what to send. */
export interface FormReply {
	lines: string[];
	hint?: string;
	actions?: { label: string; command: string }[];
	send?: Feedback;
}

const CANCEL = /^(cancel|stop|quit|never ?mind|forget it)$/;
const A_KIND: Record<Kind, string> = { bug: 'a bug', idea: 'an idea', comment: 'a comment' };
const ASK_KIND = 'Is it a bug, an idea or a comment?';
const ASK_AGAIN = 'Would you walk here again?';
const ASK_WORDS = 'Write it in your own words, then press return.';
const NOTHING: FormReply = { lines: [], hint: 'Nothing was sent.' };
const button = (command: string, label = command[0].toUpperCase() + command.slice(1)) => ({
	label,
	command
});
const cancel = button('cancel');

const wordsOf = (input: string) =>
	input
		.trim()
		.toLowerCase()
		.replace(/[.!?]+$/, '')
		.replace(/^(an?|it'?s an?|it is an?) /, '');

/** One reader's feedback, asked step by step. */
export class FeedbackForm {
	private kind?: Kind;
	private again?: Again;
	private words?: string;
	/** True once the form has been sent or put aside. */
	done = false;

	constructor(private readonly about: FeedbackAbout) {}

	first(): FormReply {
		return {
			lines: [],
			hint: ASK_KIND,
			actions: [
				button('bug', 'A bug'),
				button('idea', 'An idea'),
				button('comment', 'A comment'),
				cancel
			]
		};
	}

	answer(input: string): FormReply {
		const words = wordsOf(input);
		if (this.words === undefined && CANCEL.test(words)) return this.close(NOTHING);
		if (!this.kind) {
			const kind = KINDS.find((k) => k === words || (k === 'idea' && words === 'feature'));
			if (!kind) return this.first();
			this.kind = kind;
			return this.askAgain();
		}
		if (!this.again) {
			const again = AGAIN.find(
				(a) => a === words || (a === 'yes' && words === 'y') || (a === 'no' && words === 'n')
			);
			if (!again) return this.askAgain();
			this.again = again;
			return { lines: [], hint: ASK_WORDS };
		}
		if (this.words === undefined) {
			const written = input.trim();
			if (!written) return { lines: [], hint: ASK_WORDS };
			if (written.length > MOST_WORDS)
				return {
					lines: [],
					hint: `That is more than ${MOST_WORDS.toLocaleString('en-GB')} characters. Write it shorter, then press return.`
				};
			this.words = written;
			return this.shown();
		}
		if (words === 'yes' || words === 'y' || words === 'send' || words === 'send it')
			return this.close({ lines: [], hint: 'Sending…', send: this.feedback() });
		if (words === 'no' || words === 'n' || CANCEL.test(words)) return this.close(NOTHING);
		return this.shown();
	}

	private askAgain(): FormReply {
		return {
			lines: [],
			hint: ASK_AGAIN,
			actions: [button('yes'), button('maybe'), button('no'), cancel]
		};
	}

	private feedback(): Feedback {
		const { place, moves, map, device, browser } = this.about;
		return {
			kind: this.kind!,
			again: this.again!,
			words: this.words!,
			place,
			moves,
			...(map ? { map } : {}),
			...(device ? { device } : {}),
			...(browser ? { browser } : {})
		};
	}

	/** Everything that would be sent, as it would be sent. */
	private shown(): FormReply {
		const f = this.feedback();
		const device = [f.device && `a ${f.device}`, f.browser].filter(Boolean).join(', ');
		return {
			lines: [
				`Kind: ${A_KIND[f.kind]}.`,
				`Would walk again: ${f.again}.`,
				`Your words: “${f.words}”`,
				f.place
					? `Where: ${f.place}, after ${f.moves} ${f.moves === 1 ? 'move' : 'moves'}.`
					: 'Where: before the walk began.',
				...(f.map ? [`The map: dated ${longDate(f.map)}.`] : []),
				...(device ? [`Your device: ${device}.`] : [])
			],
			hint: 'Send it?',
			actions: [button('yes'), button('no')]
		};
	}

	private close(reply: FormReply): FormReply {
		this.done = true;
		return reply;
	}
}

/** What the page says once the feedback has gone, or has not. */
export const sentReply = (ok: boolean): FormReply => ({
	lines: [],
	hint: ok ? 'Sent. Thank you.' : 'It did not go, so nothing was sent. Try again later.'
});

export const NOT_OPEN: FormReply = { lines: [], hint: 'Feedback is not open on this page.' };
