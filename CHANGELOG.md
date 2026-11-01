# Changelog

What has changed in A Partial Guide, newest first. Each day has lines **for walkers**, in plain words, which the front page shows under “What’s new”, and lines **under the hood**, for anyone working on the code, with the pull requests that made them.

Add to it with each change worth telling: a line for walkers where a walker would notice, a line under the hood where only the code changed. The front page shows the latest three days that have lines for walkers.

## 2026-11-01

### For walkers

- The whole of Croydon is open: Selsdon, Sanderstead, New Addington, Purley, Kenley and Coulsdon join the walk, every one of the borough’s twenty areas, some 14,400 places.
- A circle you are walking is kept when you save, so a page closed halfway round goes on round the same circle.
- Quiet streets whose only record was an old postcode are told plainly, rather than at length over one line of hearsay.

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
