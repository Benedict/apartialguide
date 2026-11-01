# Roadmap

Features and ideas for the piece, in the order they are worth doing. What only Benedict can do (keys, decisions, words, letters) is in `TODO.md`. Done items leave this page; the pull requests are their record.

Where things stand: the whole of Croydon is walked (all twenty areas, about 14,400 stops, November 2026). The next question is not what to build but whether readers come back, so the phases below are chosen by what readers do, not by date.

## Next: make Croydon solid and findable

- **Notice when a live source goes quiet.** The live sources say nothing when they have no answer, by design, so if TfL, Open-Meteo, CelesTrak, adsb.lol or GDELT changes the shape of what it sends, the walk goes silent and every test still passes. A daily workflow asks each once for a known stop and checks the reply's shape against a schema; on a change it opens an issue rather than failing a build, as `map-check` does, since it depends on others' servers.
- **Records that fail loudly.** The same for the record sources, in batch: a source that changes its format should fail the Records workflow, not write an empty file.
- **Saved walks across versions.** A few frozen saved-walk files, picked up by the current engine in a test, so a change can never lose readers' walks unnoticed.
- **Mutation testing on the guards.** Stryker with the Vitest runner, on the code that enforces the hard rules (`render/founded.ts`, the guards in `narration.ts`, `parser.ts`, `grid.ts`, the records adapter's address matching), run by hand or weekly and incrementally, with no score to chase: a surviving mutant is a test to write.
- **The engine, step 3.** Split the engine's commands into modules by feature (the glass, routes, saves, the live sources, names carried), behind one handler and a table in place of the switch, when the next feature lands there. `server/export.ts` likewise into a file per page, as the privacy and front pages are.
- **Measure what readers do.** With counting on (`GA_MEASUREMENT_ID`, in `TODO.md`), a short page of what the counts say after a month: which commands are used, how far walks go, where they stop. It decides the next phase.

## Later: depth, chosen by what readers do

- **Take the walk out into the street.** Download a walk (a drift, or any walk) to follow on foot: a GPX track for a phone's map app (OsmAnd, Organic Maps, Komoot), and directions to print or read as you go: "At Bingham Road, turn left. 210 metres. Right into Northampton Road." The game speaks in compass points; on foot people need left and right, worked out from the change of bearing between one leg and the next (on within about 30°, then bear, turn, sharp, back). The most distinctive thing on this page. To settle first:
  - What goes in the directions: the turns alone, or Guide's words for each place too, as a handout to walk with.
  - The walk as the reader took it, doubling back and all, or tidied into a route; only the first is honest to the drift.
  - Safety, as the game walks on paper: main roads it leaves out, crossings it keeps. The directions should name the crossings, and say plainly they are no substitute for looking.
  - Made in the reader's browser from their own walk, sent nowhere, like the saves.
- **Walk a named way.** The long-distance walks that cross the borough: the Vanguard Way (from East Croydon towards the coast), the London Loop, the Wandle Trail and others. `follow the Vanguard Way` would give its next turn at each stop, as `route to` does, and a stop on it would say so ("This is the Vanguard Way, so the map says."), with how far along it the reader has come. The groundwork comes first: the map holds these ways as relations, and the snapshot keeps none (`server/opl.ts` passes over every relation), so only a few signposts and path pieces carrying the name come through today. To settle first:
  - Which relations to keep: walking and hiking routes only (`route=hiking|foot`), with their members' order, so a way can be followed end to end.
  - Where a way runs beyond the map's edge, as the Vanguard Way does: say where it goes next by name only, and that the map stops there.
  - Whether it is a third way of going beside routes and drift, or a route the reader asks for by the way's name.
  - The same relations give cycle routes, bus routes and tram lines, if wanted later.
- **The glass, further.** Offer its record as a picture to keep or share (the social script's type and colours); quote a plaque's words in the record as a plaque's.
- **More of the classic engine.** A walk's end ("you have walked as far as Guide remembers" at the last mark); a map of where you have been.
- **The drawn route ("Auster step 3")**, once its brief's questions are answered (`TODO.md`).
- **A Roman road in a room.** Once Digital Britannia's layers are in (`TODO.md`), Guide could tell its conjectured London–Brighton road, as hearsay, at stops within a few metres of its line, not only when the reader looks beyond.
- **The Blitz in the walk**, if a source allows it (`TODO.md`: Croydon Archives, Surrey History Centre, Bomb Sight): where bombs fell, as hearsay, at the stops nearest.
- **When houses were built, and photographs**, once their keys are in (`TODO.md`): energy certificates on examining a house, Geograph titles standing alone.
- **The inline map on the SvelteKit reader.** The exported page has it; the dev reader does not.

## Later: others on the walk

Worth it only with readers enough to meet; with few, these are empty rooms.

- **Real-time characters.** Other readers on the walk at the same time, whom you can meet and talk to. To settle first:
  - Who are they to Guide? Guide speaks only from data, so another reader is not a fact Guide can describe; they would speak for themselves.
  - Where do they meet: at the same stop only, or within earshot along a street?
  - What is said, and is any of it kept? Moderation, privacy, and whether a reader can stay unseen.
  - What carries it: a shared service (WebSockets, or an artifact's shared state). Today the site is static.
- **Record a memory here.** A reader leaves a few words at a stop, and later readers meet them there. To settle first:
  - **Whose words.** Read as found, as a bench's words are ("Someone left word here: “…”"), never in Guide's voice, and never feeding the prose written ahead of time.
  - **Where they live.** A store of their own (a database behind a function), not the repository.
  - **Moderation.** Hold each until it is read and approved, or show it only to the one who left it until then.
  - **Privacy.** No names of private people, nothing kept about who left it beyond what moderation needs, and the privacy page first.
  - **Scale.** One per reader per stop, a few lines, shown at most one or two at a time.
- **Ride the bus, in real time.** At a stop with departures, `wait for the 289` and `board` when it is due; the reader travels with that bus, told each stop as TfL predicts it is reached, and `get off` at the next. To settle first:
  - What "real time" means: the ride takes as long as the bus does (the slowness is the point), or a stop a move.
  - What Guide says on board: only the stops TfL names and when, the line and its destination; between mapped stops, Guide says the map has nothing.
  - Beyond the map's edge: ride on, told only as stop names and hearsay, or step off at the last mapped stop?
  - Whether TfL lets a page follow one vehicle (`/Vehicle/{id}/Arrivals`) from the browser; check its CORS before building. Trams the same, by line.
  - Whether riding counts as distance walked: probably not; a separate `Ridden:`, or nothing.

## Later: breadth

- **London, borough by borough.** Planned in the doc "A Partial Guide: London, borough by borough". Needs routes in tiles (today `routes.json` is the whole network at once) and borders from one London extract, so a walk crosses into the next borough as it crosses a ward. At Croydon's rate the prose is about thirty times the writing; worth it only if Croydon holds readers.

## Sources not possible as feeds

- The WWII bomb census (no download, non-commercial licence), CWGC civilian war dead (needs a written licence), Defra road noise (bulk files only, modelled).

## Known gaps, as found

- No flood zone or recorded flood lies in the borough's box (the same queries by the Thames find them): the fetchers are kept, the stores are empty.
- The template says "is a garages" of a plural kind, as the map gives it.
- The GLA tree list holds only TfL's highway trees here; Croydon Council's are not in it.
- Past maps cover only the first, smaller box: Overpass refuses automated use for the history.
- Some stops hold only a power cable (“Beddington–Rowdown 2”) or the borough's edge (“Greater London - Surrey”) and are told much alike.
