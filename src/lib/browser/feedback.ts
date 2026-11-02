import type { Feedback, FeedbackContext } from '../core/adventure/feedback';

type Post = (url: string, init: RequestInit) => Promise<Response>;

/** The kind of device, by the width of its screen and whether it is touched: nothing finer. */
export function deviceOf(width: number, touch: boolean): NonNullable<FeedbackContext['device']> {
	if (width >= 1200 || !touch) return 'desktop';
	return width >= 600 ? 'tablet' : 'phone';
}

/** The browser's family alone, from what it says of itself; the rest is never kept or sent. */
export function browserOf(userAgent: string): NonNullable<FeedbackContext['browser']> {
	if (/SamsungBrowser\//.test(userAgent)) return 'Samsung Internet';
	if (/Edg(A|iOS)?\//.test(userAgent)) return 'Edge';
	if (/Firefox\/|FxiOS\//.test(userAgent)) return 'Firefox';
	if (/Chrome\/|CriOS\//.test(userAgent)) return 'Chrome';
	if (/Safari\//.test(userAgent) && /Version\//.test(userAgent)) return 'Safari';
	return 'Other';
}

/** Sends feedback the reader has seen and said yes to, to the site's own function; true if it went. */
export async function sendFeedback(
	url: string,
	feedback: Feedback,
	post: Post = (u, init) => fetch(u, init)
): Promise<boolean> {
	if (!url) return false;
	try {
		const res = await post(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// The honeypot: a field no reader fills.
			body: JSON.stringify({ ...feedback, website: '' })
		});
		return res.ok;
	} catch {
		return false;
	}
}
