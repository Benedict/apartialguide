# Changelog

What has changed in A Partial Guide, newest first. Each day has lines **for walkers**, in plain words, which the front page shows under “What’s new”, and lines **under the hood**, for anyone working on the code, with the pull requests that made them.

Add to it with each change worth telling: a line for walkers where a walker would notice, a line under the hood where only the code changed. The front page shows the latest three days that have lines for walkers.

## 2026-11-04

### For walkers

- Streets that met a main road no longer end in a dead end there: Ashburton Road, for one, now reaches Addiscombe Road, and the A-roads themselves can be walked, as their pavements can.
- Typing a direction a little off now takes you the one way that lies near it: `south` where the only way is south-east goes south-east, and says so.

### Under the hood

- Trunk roads were left out of the street network since the first walk, as motorways are, so every street meeting one stopped short of it (reported on the walk, at Ashburton Road). They are walkable now unless the map says `foot=no`, which is now honoured on any way. A direction within a compass point (45°) of the only way there takes it (`nearExits`). A place along a street was named by a running count of every stretch built before it, so any change to the map renamed thousands (2,768 when trunk roads came in) and a walk kept at one was lost; it is now named by its way and the nodes its stretch runs between, which renames every such place once, and then no more. 354 places lose prose written for them, as what they see has changed, until it is written again.

## 2026-11-02

### For walkers

- `feedback` now asks, after your words, for an email address if you would like a reply. You can skip it, and the address is shown with everything else before anything is sent.
- Type `draw my walk` to see the line you have walked, drawn plainly, north up, and save it as a picture. Your walks are kept in your browser, so `draw all my walks` draws every one together.
- About now says where you can support the walk, on Ko-fi, if you would like to. The walk stays free.
- Type `feedback` to tell us what you found: a bug, an idea or a comment, in your own words. You see everything that would be sent before you say yes, and nothing is sent unless you do.
- Parks, woods, lakes and large buildings mapped as areas are now passed and named on the walk, and Guide tells more of what the map says of things: the words on them, their other names, a post box's cypher, a tree's species, a public footpath, the counties either side of a boundary stone. Over a thousand places are told afresh.

### Under the hood

- Feedback's optional reply address (`ADDRESS`, at most 254 characters, held the same on the page and in the function by a test), written into the issue as code so it is copied as written and mentions no one; the privacy page says it is kept only to reply, until the issue is dealt with.
- `draw my walk` (`adventure/drawing.ts`, `trails.ts`; `browser/trails.ts`): the walk keeps its line (`trail`, and an `id`, both kept in saves), where the map puts each stop come to; every walk's line is kept in the browser, the newest fifty. The drawing is plain SVG polylines in the page's colour, no street or word, and Guide says nothing of it, as the Auster brief asks. Its open questions settled: the reader's own route, kept between visits, drawn on asking; Guide is Guide, not the author; and "lived" stays.
- The feedback function imported the page's choices by a path without its extension, which Netlify's Deno bundler cannot find, so every deploy since #136 failed and the site stayed as it was. The handler now imports nothing (its choices held the same as the page's by a test), a test walks each edge function's imports, and the Deploy step prints Netlify's answer when it refuses.
- `feedback` (`adventure/feedback.ts`): asked in the page's voice, the words taken as typed and never counted; the site's own function (`server/feedback.ts`, `netlify/edge-functions/feedback.ts` at `/api/feedback`) checks it holds only the offered choices and files it as an issue in the private data repository with `FEEDBACK_TOKEN`, Netlify's alone. Built with `FEEDBACK_URL`; the privacy page tells of it only then.
- The Tidy branches workflow also runs when `data/tidy/request.env` changes on main, as the fetching workflows run from their requests; this one asks it to delete.
- The borough re-cut from Geofabrik's London and Surrey extracts, keeping the areas drawn as multipolygons; the newly spoken tags (`beyondKind`, #122's follow-on); prose written again for the 1,008 busier stops they change (1,000 pieces, all through the guards: 8 refused and rewritten). The snapshot moves into place in the private data repository as this merges.

## 2026-11-01

### For walkers

- The whole of Croydon is open: Selsdon, Sanderstead, New Addington, Purley, Kenley and Coulsdon join the walk, every one of the borough’s twenty areas, some 14,400 places.
- A circle you are walking is kept when you save, so a page closed halfway round goes on round the same circle.
- Quiet streets whose only record was an old postcode are told plainly, rather than at length over one line of hearsay.
- The front page can offer a mailing list: its sign-up form opens only when you press for it, and nothing is sent before.
- `look beyond` tells of the Roman roads, settlements and forts near Croydon: the road from London towards Brighton, the settlement at Croydon itself, Noviomagus at West Wickham.

### Under the hood

- Six areas’ records, and prose for their 1,739 busier stops (#118).
- The borough’s build takes 1 min 25 s rather than 3 min 10 s: what is near is looked up in a grid, never sought through the whole borough; the output is byte for byte the same (#114).
- The walk’s state is one value, saved and restored through tables the compiler holds complete, so no part can be left out of a save again (#116); the glass is saved (#115).
- The check against unfounded words reads a plural possessive (“UK Power Networks’”) as its name (#117).
- An ended postcode alone no longer makes a stop busier; 465 pieces of prose for such stops removed (#119).
- Areas drawn in OpenStreetMap as multipolygons (large parks, woods, lakes, big buildings) are read, joined and told; the Snapshot workflow can cut a downloaded extract itself. Not yet in the walk: the snapshot that holds them waits on a private repository (#122).
- The roadmap is `BACKLOG.md`; what only Benedict can do is `TODO.md` (#120, #121, #123).
- The repository is renamed `apartialguide`; every link to it follows (`REPO`).
- Snapshots and letters move to a private repository, `apartialguide-data`, which the workflows read with `DATA_TOKEN`; About says the map’s snapshot is available on request, as OpenStreetMap’s licence asks.
- Digital Britannia read from its GeoPackage, in British National Grid, converted with proj4; 40 Roman roads and sites within reach of the borough; credited on About with the Rural Settlement of Roman Britain project (#128).
- `SIGNUP_URL` on the front page: a Substack form opens in place once pressed, allowed by the policy's `frame-src` alone; any other list is linked; the privacy page says what is sent, and when (#129).
- The brand kit in `brand/`: the logo in six colourways (the page's four, black and white) as SVG and PNG, and headers for Substack, LinkedIn, X and Bluesky, drawn by `npm run brand:kit`; the dev server's leftover Svelte favicon is the mark (#130).
- Energy certificates and Geograph photographs are kept out of prose written ahead of time (`keptOutOfProse`): their records reach neither the prompt nor its key, nor make a stop busier, so fetching them changes no place's prose. Energy certificates come from the register's new search, with only `EPC_API_KEY`; it gives a house's rating and when, not its age.
- A Tidy branches workflow, run by hand, deletes branches already in main that GitHub leaves behind (those merged other than by their own pull request), listing them first unless told to delete; never main, an open pull request's branch, or one with a commit main lacks (`scripts/tidy-branches.sh`).
- The Snapshot workflow takes several extracts in `EXTRACT`, merged before the cut, as Croydon's box crosses into Surrey (the London extract alone left out 46,123 nodes beyond the borough's edge).

## 2026-10-31

### For walkers

- Croydon opened area by area: Shirley, Fairfield (from East Croydon), Woodside, Selhurst, South Norwood, Park Hill & Whitgift, Broad Green, Bensham Manor, Thornton Heath, South Croydon, Waddon, Crystal Palace & Upper Norwood and Norbury.
- Begin a walk wherever you like: in any open area, at a place or street by its name, at a postcode, at a latitude and longitude, or anywhere by chance.
- `place a glass` sets a circle down where you stand: walk it, and it keeps a record of what you met.
- Works and closures on the roads are told as you reach them, and `news` gives the day’s headlines that name the place.
- With more than two areas open, the start offers them behind one choice rather than a wall of buttons.
- A food hygiene rating still awaiting inspection is said in words, and no longer given the inspectors’ placeholder date of 1901.
- About carries a word of warning: the data may be out of date or wrong, and is not for directions or safety.
- A privacy page says what stays in your browser and what is sent, and to whom.

### Under the hood

- The whole borough is one map, enriched and opened area by area; only open areas are compiled, and the edge of the rest is named (#80, #81, #84).
- Records fetched per area, kept to that area, so no other area’s prose changes (#81, #82); an address two places share goes to the nearer (#102).
- The Deploy workflow refuses an open area whose first place the map cannot find (#103).
- The borough’s stops are built in 11 s rather than 102 s (#97); one area is narrated without visiting the rest (#86).
- Code under the AGPL, Guide’s prose under CC BY-SA 4.0, contributions signed off under the DCO, with issue forms and a guide to writing a place (#100).
- The fetching workflows run only when the commit pushed edits their request (#106, #112).
- Letters drafted for the Blitz bomb census; Digital Britannia’s terms confirmed (#107, #108, #109).

## 2026-10-30

### For walkers

- The screen can take a terminal’s colours: green, amber or red, as well as paper.
- The guide has a mark, a junction of streets turned into a prompt, and is set in Commit Mono throughout.
- Plaques and benches are read as they are written, and a stop is made beside each plaque.
- A page that does not exist answers as a text adventure answers a wall: “You can’t go that way.”

### Under the hood

- Deployed to Netlify, with previews on request (#69, #70, #71).
- The site meets The Website Specification’s required and recommended items, with a Content Security Policy on every page (#75, #76, #77).
- CI fails when a branch has fewer tests than its base (#68); pictures for the site’s social profiles (#78).

## 2026-10-29

### For walkers

- More accounts of each place: wildlife seen there, postcodes that have ended, companies registered at an address, and today’s air.

### Under the hood

- A switch for which fetched sources the walk uses (#34).

## 2026-10-28

### For walkers

- Benches, and the words written on them.
- Guide’s introduction gives an account of what Guide carries, and never names where it came from.
- The busier places are told in Guide’s own voice, in prose written ahead of time, and neighbouring places no longer repeat each other.

### Under the hood

- OpenBenches as a source (#33); Guide’s introduction from the world’s ledger (#32); five writers in Guide’s voice, with what the places next door say kept from repeating (#31).

## 2026-10-26

### For walkers

- A classic text adventure: a place in full the first time and briefly on return, names you can carry and drop, and how far you have walked as the goal.
- Walks can be saved in five slots, and picked up again.

### Under the hood

- The model is given the map in words, never raw tags (#30); prose for the world the page publishes, and published with it (#29); saves (#28); the classic engine (#27).

## 2026-10-25

### For walkers

- It is called A Partial Guide.
- Live departures at bus and tram stops, today’s weather, and where the sun and moon stand.
- More accounts: food hygiene ratings, listed buildings, planning applications, plaques, house sales and crime.
- Guide says when a step crosses from one ward into another.
- Guide carries the broken names it finds, and brings one back, out of place, when you least expect it; two names that share a word are set side by side.
- About and Settings pages, `gps`, and a prompt the on-screen keyboard can’t cover.

### Under the hood

- Published on every push to main (#20); the exported page plays again, and CI checks that it does (#25); listed trees counted per street (#24); Wikidata as another account (#13).

## 2026-10-24

### For walkers

- The first walk: Addiscombe as a text adventure, told from the map alone, remembering what the map has lost.

### Under the hood

- The walking skeleton (#1); the whole game as one self-contained page (#6); the model renderer, ready for a key (#4).
