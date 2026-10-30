# The site against The Website Specification

Where A Partial Guide stands against [The Website Specification](https://specification.website/)
(Joost de Valk and contributors, CC BY 4.0): every Required and Avoid item, and the Recommended
items worth doing here. Checked on the built site (`SITE_DIR=… npm run export`): the front page,
the walk and the 404; and, where a row says live, on https://apartialguide.com itself (30 October
2026). Update it when a row changes.

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
| HTTPS and TLS                    | ✓   | Live: HTTPS only; `www.` redirects (301) to `https://apartialguide.com/`.                                                                |
| HSTS                             | ✓   | Live: one year, from Netlify; `netlify.toml` asks the same.                                                                              |
| X-Content-Type-Options: nosniff  | ✓   | `netlify.toml`.                                                                                                                          |
| Clickjacking protection          | ✓   | `frame-ancestors 'none'` and `X-Frame-Options: DENY`.                                                                                    |
| Cookie attributes                | —   | The site sets no cookies; Google Analytics, once a reader says yes, sets its own.                                                        |
| Stable URLs                      | ✓   | `/`, `/walk/`; tiles named by place.                                                                                                     |
| Core Web Vitals                  | ◑   | First words in well under a second; not yet measured in the field.                                                                       |
| Image optimisation               | ✓   | Two small PNGs; the rest is SVG.                                                                                                         |
| Cache-Control headers            | ✓   | Fonts a week; pages and tiles checked each deploy.                                                                                       |
| Compression                      | ✓   | Live: Brotli; the world is gzipped as well.                                                                                              |
| Privacy policy                   | ⚑   | The About page says what is counted, but a policy needs the controller's name, a postal address and a contact, linked from every footer. |
| Cookie consent                   | ✓   | Nothing of Google's loads before a yes; Settings changes the answer.                                                                     |
| Custom error pages (404, 500)    | ◑   | A 404 in the site's voice; a static site has no 500 of its own.                                                                          |
| lang attribute on inline content | —   | No content in another language.                                                                                                          |

## Avoid (6)

| Item                                  |     |                                                                                                   |
| ------------------------------------- | --- | ------------------------------------------------------------------------------------------------- |
| Soft 404s                             | ✓   | Live: a missing path answers 404, with `404.html`.                                                |
| Empty links and buttons               | ✓   | Every control has words.                                                                          |
| Accessibility overlays                | ✓   | None.                                                                                             |
| X-XSS-Protection                      | ✓   | Not sent.                                                                                         |
| HTTP/1.1 workarounds                  | ◑   | The engine is one bundle, as the single page needs; the site's world is already split into tiles. |
| Automatic IP-based language redirects | ✓   | None.                                                                                             |

## Recommended

| Item                         |     | How                                                                                                                                                                                                                                         |
| ---------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<meta name="description">`  | ✓   | Its own on each page (`server/meta.ts`, `PAGES`).                                                                                                                                                                                           |
| Canonical URL                | ✓   | The front page and the walk, at `SITE_URL`; none for the 404.                                                                                                                                                                               |
| Favicons and app icons       | ✓   | SVG in the page, `/favicon.ico`, the apple-touch icon, 192 and 512 px icons and a maskable one, drawn by `npm run brand`.                                                                                                                   |
| `<meta name="theme-color">`  | ✓   | Black, the page's paper; the green, amber and red papers are within a shade of it.                                                                                                                                                          |
| `<meta name="color-scheme">` | ✓   | `dark` on every page.                                                                                                                                                                                                                       |
| Open Graph                   | ✓   | Title, description, type, URL and image, on the front page and the walk.                                                                                                                                                                    |
| robots.txt                   | ✓   | Every crawler welcome; names the sitemap.                                                                                                                                                                                                   |
| XML sitemaps                 | ✓   | The front page and the walk, dated by the map.                                                                                                                                                                                              |
| Structured data (JSON-LD)    | ✓   | The site as a `WebSite`, the walk as a `VideoGame`.                                                                                                                                                                                         |
| Web app manifest             | ✓   | `/site.webmanifest`: the walk can be added to a home screen and opens at the prompt.                                                                                                                                                        |
| `/llms.txt`                  | ✓   | What the walk is, how it is played, where its words come from (from `site/sources.ts`).                                                                                                                                                     |
| `/.well-known/security.txt`  | ⚑   | Needs a contact address.                                                                                                                                                                                                                    |
| Content Security Policy      | ✓   | Per page (`server/csp.ts`): the page's own scripts by their hashes, worked out at build, and only the map's library and, where visits are counted, Google's; data only from the places the walk asks. `npm run smoke` fails on any refusal. |

Croydon behind its flag is served from `/croydon/`: its pages are `noindex`, but their canonical URLs would name the root's; give the export a base path before the flag is turned on for long.
