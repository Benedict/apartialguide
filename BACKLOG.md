# Backlog

What is left, and ideas for later phases. Done items move to the changelog in the PRs.

## Next

- **Real-time characters.** Other readers on the walk at the same time, whom you can meet and talk to. To settle first:
  - Who are they to Guide? Guide speaks only from data, so another reader is not a fact Guide can describe; they would speak for themselves.
  - Where do they meet: at the same stop only, or within earshot along a street?
  - What is said, and is any of it kept? Moderation, privacy, and whether a reader can stay unseen.
  - What carries it: a shared service (WebSockets, or an artifact's shared state). Today the piece is one static file.
- **More of the classic engine.** Ideas the distance goal opens: a walk's end (a "you have walked as far as Guide remembers" at the last mark), a map of where you have been, `save`/`restore` in the browser.
- **The inline map on the SvelteKit reader.** The exported page has it; the dev reader does not.

## Waiting on you

- **About page:** a few lines about Benedict, and a link if wanted.
- **The edge of the map:** crop to the Addiscombe East and West wards, or keep the wider walk and let Guide note the boundaries (as now)?
- **Keys** as repository secrets: `GEOGRAPH_API_KEY` (photo captions), `COMPANIES_HOUSE_API_KEY` (businesses at addresses), `ANTHROPIC_API_KEY` (prose written ahead of time).
- **Auster step 3:** the drawn route, once the brief's open questions are answered.
- **"lived" or "loved"** in Guide's introduction.

## Known gaps, as found

- The GLA tree list holds only TfL's highway trees here; Croydon Council's are not in it.
- Past maps cover only the first, smaller box: Overpass refuses automated use for the history.
