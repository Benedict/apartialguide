/**
 * The page for a path the site does not have (Netlify serves `404.html` for any). It is the page
 * speaking, as a text adventure does at a wall, not Guide: it says nothing of any place. Its links
 * go from the root, as it may be served at any depth.
 */
export function notFoundPage(): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>A Partial Guide</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#000000">
<style>
	/* As the walk looks: one typeface, light on dark, an inverse bar. */
	:root {
		--paper: #000; --ink: #d4d4cc; --bright: #fff; --muted: #8e8e86;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
	}
	html { background: var(--paper); }
	body { margin: 0; background: var(--paper); color: var(--ink); font: 1rem/1.6 var(--mono); }
	a { color: var(--bright); }
	.bar { background: var(--ink); color: var(--paper); padding: 0.35rem 1rem; font-weight: bold; }
	main { max-width: 44rem; margin: 0 auto; padding: 3rem 1rem; }
	.command { color: var(--bright); }
	.reply { color: var(--bright); font-size: 1.25rem; margin: 0.5rem 0 2rem; }
</style>
</head>
<body>
<div class="bar">A Partial Guide</div>
<main>
	<p class="command">&gt; go there</p>
	<p class="reply">You can't go that way.</p>
	<p>There is no page here. <a href="/walk/">Take up the walk</a>, or go back to <a href="/">the start</a>.</p>
</main>
</body>
</html>
`;
}
