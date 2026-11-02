import {
	AGAIN,
	BROWSERS,
	DEVICES,
	KINDS,
	MOST_WORDS,
	type Feedback
} from '../core/adventure/feedback';

/**
 * The feedback function: takes the feedback a reader has seen and said yes to on the walk, checks
 * it holds only the choices the page offers, and files it as an issue in a private repository with
 * a token the page never sees. Nothing else is kept: the visitor's address is used only to count how
 * often they send, in this instance's memory, and is never stored or passed on.
 */
export interface FeedbackConfig {
	/** A token that may open issues in `REPO` (`FEEDBACK_TOKEN`); without it, feedback is closed. */
	TOKEN?: string;
	/** Where issues are filed: owner/name. */
	REPO: string;
	/** The site allowed to send. */
	ALLOWED_ORIGIN: string;
	/** Who is sending, to count how often: the visitor's address, never stored. */
	visitor?: string;
}

/** How many a visitor may send in a while, counted in this instance's memory: a speed bump, not a wall. */
export class Limiter {
	private seen = new Map<string, number[]>();
	constructor(
		private readonly most = 5,
		private readonly withinMs = 3_600_000,
		private readonly now: () => number = Date.now
	) {}

	allow(visitor: string): boolean {
		const now = this.now();
		const recent = (this.seen.get(visitor) ?? []).filter((t) => now - t < this.withinMs);
		if (recent.length >= this.most) {
			this.seen.set(visitor, recent);
			return false;
		}
		this.seen.set(visitor, [...recent, now]);
		return true;
	}
}

const shared = new Limiter();

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
	typeof value === 'string' && (list as readonly string[]).includes(value);

/** Feedback as the page sent it, if it holds only what the page offers; else undefined. */
export function validFeedback(body: unknown): Feedback | undefined {
	if (!body || typeof body !== 'object') return undefined;
	const b = body as Record<string, unknown>;
	const words = typeof b.words === 'string' ? b.words.trim() : '';
	if (!isOneOf(KINDS, b.kind) || !isOneOf(AGAIN, b.again)) return undefined;
	if (!words || words.length > MOST_WORDS) return undefined;
	if (typeof b.place !== 'string' || b.place.length > 200) return undefined;
	if (!Number.isInteger(b.moves) || (b.moves as number) < 0) return undefined;
	if (b.map !== undefined && !(typeof b.map === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.map)))
		return undefined;
	if (b.device !== undefined && !isOneOf(DEVICES, b.device)) return undefined;
	if (b.browser !== undefined && !isOneOf(BROWSERS, b.browser)) return undefined;
	return {
		kind: b.kind,
		again: b.again,
		words,
		place: b.place,
		moves: b.moves as number,
		...(b.map ? { map: b.map as string } : {}),
		...(b.device ? { device: b.device } : {}),
		...(b.browser ? { browser: b.browser } : {})
	};
}

/** No one is mentioned, whatever the words say: an @ is kept from reaching a name. */
const unmentioned = (text: string) => text.replace(/@/g, '@​');
const cell = (text: string) => unmentioned(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ');

/** The issue for a piece of feedback: its kind and first words as the title, the rest as a table. */
export function issueOf(f: Feedback): { title: string; body: string; labels: string[] } {
	const kind = f.kind[0].toUpperCase() + f.kind.slice(1);
	const first = unmentioned(f.words.replace(/\s+/g, ' '));
	const title = `${kind}: ${first}`;
	const rows: [string, string][] = [
		['Kind', f.kind],
		['Would walk again', f.again],
		['Where', f.place ? `${f.place}, after ${f.moves} moves` : 'before the walk began'],
		...(f.map ? ([['The map', f.map]] as [string, string][]) : []),
		...(f.device || f.browser
			? ([['Device', [f.device, f.browser].filter(Boolean).join(', ')]] as [string, string][])
			: [])
	];
	const body = [
		unmentioned(f.words)
			.split('\n')
			.map((line) => `> ${line}`)
			.join('\n'),
		'',
		'| | |',
		'| --- | --- |',
		...rows.map(([k, v]) => `| ${k} | ${cell(v)} |`),
		'',
		'Sent with `feedback` on the walk.'
	].join('\n');
	return {
		title: title.length > 80 ? `${title.slice(0, 79).trimEnd()}…` : title,
		body,
		labels: ['feedback', f.kind]
	};
}

export async function feedbackHandler(
	request: Request,
	config: FeedbackConfig,
	{
		send = fetch,
		limiter = shared
	}: { send?: (url: string, init: RequestInit) => Promise<Response>; limiter?: Limiter } = {}
): Promise<Response> {
	const headers = {
		'Access-Control-Allow-Origin': config.ALLOWED_ORIGIN,
		'Content-Type': 'application/json',
		'Cache-Control': 'no-store'
	};
	const answer = (status: number, body: object) =>
		new Response(JSON.stringify(body), { status, headers });
	if (request.method !== 'POST') return answer(405, { error: 'POST only' });
	if (request.headers.get('Origin') !== config.ALLOWED_ORIGIN)
		return answer(403, { error: 'not from this site' });
	if (!config.TOKEN) return answer(503, { error: 'feedback is not open' });
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return answer(400, { error: 'not JSON' });
	}
	// A field no reader sees: filled, it was not a reader. Answered as sent, so it learns nothing.
	if ((body as Record<string, unknown>)?.website) return answer(201, { ok: true });
	const feedback = validFeedback(body);
	if (!feedback) return answer(400, { error: 'not feedback the page offers' });
	if (!limiter.allow(config.visitor ?? '')) return answer(429, { error: 'too many; wait a while' });
	try {
		const res = await send(`https://api.github.com/repos/${config.REPO}/issues`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.TOKEN}`,
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				'Content-Type': 'application/json',
				'User-Agent': 'a-partial-guide-feedback'
			},
			body: JSON.stringify(issueOf(feedback))
		});
		if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
		return answer(201, { ok: true });
	} catch {
		return answer(502, { error: 'not filed' });
	}
}
