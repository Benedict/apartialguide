# Security

Please don't report a security problem in a public issue. Report it privately through GitHub: on this repository's **Security** tab, choose **Report a vulnerability**. Reports are read by the maintainer, Benedict, who will reply there.

The site asks nothing of its readers and keeps nothing about them (see its privacy page), so the likeliest problems are in what the page runs or what it may ask of others: its Content Security Policy (`src/lib/server/csp.ts`) and the security headers in `netlify.toml`.
