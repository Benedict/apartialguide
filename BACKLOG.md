# Backlog

What is left, and ideas for later phases. Done items move to the changelog in the PRs.

## Next

- **Real-time characters.** Other readers on the walk at the same time, whom you can meet and talk to. To settle first:
  - Who are they to Guide? Guide speaks only from data, so another reader is not a fact Guide can describe; they would speak for themselves.
  - Where do they meet: at the same stop only, or within earshot along a street?
  - What is said, and is any of it kept? Moderation, privacy, and whether a reader can stay unseen.
  - What carries it: a shared service (WebSockets, or an artifact's shared state). Today the piece is one static file.
- **Take the drift out into the street.** Download a walk (a drift, or any walk) to follow on foot: a GPX track for a phone's map app (OsmAnd, Organic Maps, Komoot), and directions to print or read as you go: "At Bingham Road, turn left. 210 metres. Right into Northampton Road." The game speaks in compass points; on foot people need left and right, worked out from the change of bearing between one leg and the next (on within about 30°, then bear, turn, sharp, back). To settle first:
  - What goes in the directions: the turns alone, or Guide's words for each place too, as a handout to walk with.
  - The walk as the reader took it, doubling back and all, or tidied into a route; only the first is honest to the drift.
  - Safety, as the game walks on paper: main roads it leaves out, crossings it keeps. The directions should name the crossings, and say plainly they are no substitute for looking.
  - Made in the reader's browser from their own walk, sent nowhere, like the saves.
- **Ride the bus, in real time.** At a stop with departures, `wait for the 289` and `board` when it is due; the reader then travels with that bus, told each stop as TfL predicts it is reached, and `get off` at the next. To settle first:
  - What "real time" means: the ride takes as long as the bus does (the slowness is the point, a Sinclair walk against the grain), or time is compressed to a stop a move.
  - What Guide says on board. Only facts: the stops TfL names and when, the line and its destination. Between mapped stops the map has nothing to say, and Guide should say so rather than fill it.
  - Beyond the map's edge (the 289 runs to Purley and Elmers End): ride on, told only as stop names and hearsay, or step off at the last mapped stop?
  - Whether TfL lets a page follow one vehicle (`/Vehicle/{id}/Arrivals`) from the browser, as it does arrivals; check its CORS before building. Trams the same, by line.
  - Does riding count as distance walked? The goal is walking, so probably not: a separate `Ridden:` on the status line, or nothing.
- **More of the classic engine.** Ideas the distance goal opens: a walk's end (a "you have walked as far as Guide remembers" at the last mark), a map of where you have been.
- **The inline map on the SvelteKit reader.** The exported page has it; the dev reader does not.

## Waiting on you

- **About page:** a few lines about Benedict, and a link if wanted.
- **The edge of the map:** crop to the Addiscombe East and West wards, or keep the wider walk and let Guide note the boundaries (as now)?
- **Keys** as repository secrets: `EPC_EMAIL` and `EPC_API_KEY` (when houses were built), `GEOGRAPH_API_KEY` (photo titles). Then add `epc,geograph` to `data/records/request.env` and push. Companies need no key (the free monthly file).
- **Geograph's licence:** CC BY-SA asks for each photographer's name; the About page credits them only as a body. Name each, or leave Geograph out?
- **Auster step 3:** the drawn route, once the brief's open questions are answered.
- **"lived" or "loved"** in Guide's introduction.

## Sources still to plug in

- **A Roman road in a room:** Digital Britannia's conjectured London–Brighton road passes inside the map's western edge. Once its data is in, Guide could tell it, as hearsay, at stops within a few metres of its line, not only when the reader looks beyond.

- **Roadworks**, live, from TfL's road disruption API (no key).
- Not possible as feeds: the WWII bomb census (no download, non-commercial licence; ask the University of Portsmouth), CWGC civilian war dead (needs a written licence), Defra road noise (bulk files only, modelled).

## Known gaps, as found

- No flood zone or recorded flood lies in the box (the same queries by the Thames find them): the fetchers are kept, the stores are empty.
- The template says "is a garages" of a plural kind.

- The GLA tree list holds only TfL's highway trees here; Croydon Council's are not in it.
- Past maps cover only the first, smaller box: Overpass refuses automated use for the history.
