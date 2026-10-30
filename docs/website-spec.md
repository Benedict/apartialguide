# The site against The Website Specification

Where A Partial Guide stands against [The Website Specification](https://specification.website/)
(Joost de Valk and contributors, CC BY 4.0): every Required and Avoid item, and the Recommended
items worth doing here. Checked on the built site (`SITE_DIR=… npm run export`): the front page,
the walk and the 404. Update it when a row changes.

✓ meets it · ✗ does not yet · ◑ partly · — does not apply · ⚑ needs Benedict

## Required (36)

| Item                             |     | How                                                                                                                                      |
| -------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| The HTML doctype                 | ✓   | First line of every page.                                                                                                                |
| The lang attribute on `<html>`   | ✓   | `lang="en"`.                                                                                                                             |
| `<meta charset>`                 | ✓   | UTF-8, in the first 1024 bytes.                                                                                                          |
| `<meta viewport>`                | ✓   | Device width; zoom never disabled.                                                                                                       |
| The `<title>` element            | ✓   | One per page.                                                                                                                            |
| Redirects (301/302/308)          | —   | The site redirects nothing.                                                                                                              |
| Meta robots and X-Robots-Tag     | ✓   | Public pages indexable; the 404 and Croydon behind its flag `noindex` (meta and header).                                                 |
| Heading hierarchy                | ✓   | One h1 first, no skipped levels (`server/structure.ts`, tested on every page).                                                           |
| Colour contrast                  | ✓   | Every palette measured: text WCAG AAA, quieter words AA (`site/themes.ts`).                                                              |
| Image alt text                   | ✓   | The pages carry no images but the logo, which is labelled.                                                                               |
| Form labels                      | ✓   | The prompt is labelled; every setting is a labelled control.                                                                             |
| Keyboard navigation              | ✓   | Native links, buttons and inputs only.                                                                                                   |
| Visible focus indicators         | ✓   | Buttons invert on focus; nothing hides focus without a replacement.                                                                      |
| Skip links                       | ✓   | First in each page: to the content, or on the walk to the prompt.                                                                        |
| Semantic HTML and landmarks      | ✓   | `<main>` on every page; `<nav>` for the walk's menu.                                                                                     |
| Descriptive link text            | ✓   | No "click here".                                                                                                                         |
| Accessible form errors           | —   | No form that can be wrong: a command Guide does not know is answered in the walk.                                                        |
| Document and parts language      | ✓   | English throughout.                                                                                                                      |
| Reduced motion                   | —   | Nothing on the pages moves.                                                                                                              |
| Captions and transcripts         | —   | No audio or video.                                                                                                                       |
| Accessible data tables           | —   | No tables.                                                                                                                               |
| Touch target size                | ✓   | Every control at least 24×24 px, checked by `npm run smoke` on every page.                                                               |
| HTTPS and TLS                    | ✓   | Netlify serves HTTPS only.                                                                                                               |
| HSTS                             | ✓   | `netlify.toml`, one year.                                                                                                                |
| X-Content-Type-Options: nosniff  | ✓   | `netlify.toml`.                                                                                                                          |
| Clickjacking protection          | ✓   | `frame-ancestors 'none'` and `X-Frame-Options: DENY`.                                                                                    |
| Cookie attributes                | —   | The site sets no cookies; Google Analytics, once a reader says yes, sets its own.                                                        |
| Stable URLs                      | ✓   | `/`, `/walk/`; tiles named by place.                                                                                                     |
| Core Web Vitals                  | ◑   | First words in well under a second; not yet measured in the field.                                                                       |
| Image optimisation               | ✓   | Two small PNGs; the rest is SVG.                                                                                                         |
| Cache-Control headers            | ✓   | Fonts a week; pages and tiles checked each deploy.                                                                                       |
| Compression                      | ✓   | Netlify compresses; the world is gzipped as well.                                                                                        |
| Privacy policy                   | ⚑   | The About page says what is counted, but a policy needs the controller's name, a postal address and a contact, linked from every footer. |
| Cookie consent                   | ✓   | Nothing of Google's loads before a yes; Settings changes the answer.                                                                     |
| Custom error pages (404, 500)    | ◑   | A 404 in the site's voice; a static site has no 500 of its own.                                                                          |
| lang attribute on inline content | —   | No content in another language.                                                                                                          |

## Avoid (6)

| Item                                  |     |                                                                                                   |
| ------------------------------------- | --- | ------------------------------------------------------------------------------------------------- |
| Soft 404s                             | ✓   | Netlify answers a missing path with 404 and `404.html`.                                           |
| Empty links and buttons               | ✓   | Every control has words.                                                                          |
| Accessibility overlays                | ✓   | None.                                                                                             |
| X-XSS-Protection                      | ✓   | Not sent.                                                                                         |
| HTTP/1.1 workarounds                  | ◑   | The engine is one bundle, as the single page needs; the site's world is already split into tiles. |
| Automatic IP-based language redirects | ✓   | None.                                                                                             |

## Recommended, next

Worth doing here, in roughly this order:

- `<meta name="description">` on the walk and the 404, and `<meta name="color-scheme" content="dark">` everywhere.
- robots.txt (in `static/`, not yet copied into the site), and a sitemap: needs `SITE_URL` ⚑.
- Canonical URLs and `og:url`: need `SITE_URL` ⚑.
- A web app manifest, a maskable icon and `/favicon.ico`.
- Structured data: the site as a `WebSite`, the walk as a `VideoGame`.
- `/llms.txt`: what the walk is, for agents.
- `/.well-known/security.txt`: needs a contact address ⚑.
- `theme-color` following the reader's colours.
- A Content Security Policy: possible, but the walk asks several outside services from the reader's browser, so it needs care.
