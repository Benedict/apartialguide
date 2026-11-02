// The feedback function as a Netlify Edge Function, on the same site as the page. It files what a
// reader has seen and said yes to as an issue in the private data repository, with a token the page
// never sees (`FEEDBACK_TOKEN`, set in Netlify's environment). The logic is the shared handler's.
import { feedbackHandler } from '../../src/lib/server/feedback.ts';

declare const Netlify: { env: { get(name: string): string | undefined } };

const REPO = 'Benedict/apartialguide-data';

export default (request: Request, context: { ip?: string }) =>
	feedbackHandler(request, {
		TOKEN: Netlify.env.get('FEEDBACK_TOKEN'),
		REPO,
		ALLOWED_ORIGIN: new URL(request.url).origin,
		visitor: context.ip
	});

export const config = { path: '/api/feedback', method: 'POST' };
