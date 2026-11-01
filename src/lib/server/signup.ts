/**
 * The mailing list (`SIGNUP_URL`): a Substack publication's sign-up form may open in the page, once
 * the reader presses for it; any other list is only linked, and signed up to on its own page.
 */
export function signupFrame(url: string | undefined): string | undefined {
	if (!url) return undefined;
	try {
		const { protocol, host, origin } = new URL(url);
		return protocol === 'https:' && /^[a-z0-9-]+\.substack\.com$/i.test(host)
			? `${origin}/embed`
			: undefined;
	} catch {
		return undefined;
	}
}
