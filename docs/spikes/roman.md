# Spike: Digital Britannia as a walk of its own

**Question.** Is Digital Britannia (Roman roads, settlements, forts, camps and milestones) rich enough to stand as a text adventure, told from the data alone?

**What was built** (branch `roman-spike`, not merged, not linked from anywhere):

- `src/lib/roman/world.ts` (`romanWorld`, tested with invented roads). A stop is made where a road ends, where roads meet, and at each site within 2 km of a road. Each way runs along a road to the next stop, by compass, with its name and length.
- Every word of a place is the data's:
  - a site's kind as kept (“Vicus - large >9Ha”);
  - its Roman name as hearsay;
  - a fort's kind in each age kept;
  - a milestone's words as they are;
  - each road's confidence in the layer's own words, read from the GeoPackage's style: “Certain - +/- 30m”, “Probable +/- 200m”, “Conjectured”, “No evidence - Requires invetsigation”.
- `npm run roman:spike` (`BRITANNIA_GPKG=…`). It builds the South-East (`ROMAN_BOX`, default -1.6,50.6,1.6,51.9), plays ten moves from London into `build/roman/transcript.md`, and writes one playable page, `build/roman/roman.html`, which `npm run smoke` passes. The ten moves are in `roman-transcript.md` (the South-East) and `roman-wall-transcript.md` (the Wall).

## What it found

**First, one road alone is too thin.** Stane Street is one segment of 90 km, “Certain - +/- 30m” throughout, with no one named as identifying it. Along it lie 5 settlements and 4 military sites, and no camps or milestones. That gives about six places, 15–20 km apart.

**The network is playable, but mostly an index.** The South-East has 303 stops, of which 85 have a site, with 2.2 ways per stop on average. The other 218 stops are only where roads meet or end. Those rooms say a road’s name and its confidence, then the ways. Steps run 1–16 km.

**What is worth reading:**

- London's fort, kept age by age (Claudio-Neronian, Flavian, Nerva-Hadrianic).
- Staines: “It is said it was called “PONTES””.
- The roads' uncertainty, as found: “Verulamium to Shenley Mill Hill??”, “London to”, and “No evidence - Requires invetsigation”.

The confusion is earned, as the project wants.

**What is not:**

- The same confidence is said again at every stop along a road.
- Bare junctions are titled by a road's name, so “London to Belgravia” comes three times in four moves.
- The London room is a wall: three sites and ten roads.

**Faults in the spike** (not in the data):

- Some ways are “0 km”: stops nearer than 1 km should have been one.
- Roads that cross mid-length, where neither ends, are not joined.

## What would make it hold

1. **Walk site to site.** Pass bare junctions on the way, as the Croydon walk passes driveways. Every place is then a site: about 85 places in the South-East.
2. **Tell a road's confidence only when it changes:** “From here the line is Conjectured.” That turns the data's uncertainty into the walk's event, rather than a refrain.
3. **Time as a second axis.** The forts are kept by age, so a `when` (Claudio-Neronian … 4th Century) could let the same road be walked in a different century, its forts appearing and going.
4. **Milestones and the Wall.** The North (Hadrian's Wall, milecastles, the Antonine Wall) is where the data is densest. The South-East is not the fairest test.

## Verdict

The data is too thin for a walk built the way Croydon's is, stop by stop. It may hold as a different kind of walk: site to site, a day's march at a time, told by changes in certainty and age, not by what is in view. That is a design question before it is a build one.

The cheaper way to use it stays the backlog's “Roman road in a room”: told within the Croydon walk, where the modern place gives it company.

Licence: Digital Britannia © Mike Haken 2026, CC BY-NC 4.0, and the Rural Settlement of Roman Britain project. A standalone piece taking the Wall would also credit WallCAP (CC BY 4.0).

## Round two: site to site, and the Wall

**What changed:**

- **Places are sites only.** A fork or a road's end is passed, never stopped at.
- **Each way is a stage to the next site.** It is told by where it goes, how far, and what changes on it: the road, its confidence (“Certain - +/- 30m for 3.3 km, then Conjectured for 7.8 km”), and the county (“into Durham”), said only where both ends have a county and they differ.
- **Milecastles are places.** Each is told by its number and name, with status, condition, type, gate and finds, and its account as found. The data cuts accounts at 254 characters, so some end mid-word (“…rockeries (Simp”).
- **The Wall itself is a way.** The Ditch and Vallum are kept out as ways.
- **The ways out of a place are “Ways”, not “Exits”.** The engine takes each world's own word (`AdventureWorld.ways`).
- **Nothing is said twice at one place.** On the walk, a kept line heard at either of the last two places is left out, as on the borough's walk: each place now comes as labelled parts.
- `ROMAN_AREA=wall` (the default, from Wallsend) or `south-east` (from London). The script scores each walk against the measures set before the build.

**Results:**

| Measure (set before the build)              | Wanted  | The Wall        | The South-East |
| ------------------------------------------- | ------- | --------------- | -------------- |
| Places with two or more facts beyond a name | 80%     | 79% (93 of 118) | 25% (21 of 85) |
| Sentences said again at the next place      | 0       | 0               | 0              |
| Moves whose stage carries a change          | 7 of 10 | 0 of 10         | 4 of 10        |

**By the measures, neither passes.**

The South-East fails clearly. It is thin, as round one found.

The Wall misses the first measure by one place in a hundred. It fails the third entirely, and that is a fault in the measure, not the walk. A stage along the Wall has nothing to change: the same line runs the whole way, with no confidence recorded. The third measure was written for roads.

The Wall's events are of another kind. Each milecastle's condition and account changes from one to the next:

- “Destroyed”;
- “By Record”;
- “Damaged; Gate Type: IV”, with coins, brooches and inscriptions found;
- a site now under a road;
- remains carted off for rockeries.

Read the transcript, and the Wall reads as a walk. Its texture is the accounts' own: what was found, lost, built over or never confirmed. That is close to the borough's walk in kind. It is the record of a place, with its gaps showing.

**The fair conclusion.** A standalone walk could work along the Wall, and not across the South. It would be a different measure of success: told by the state of what is kept, not by changes on the road.

Whether it holds attention past ten milecastles is the real test. That is Benedict's reading, not a number.

**If it goes on:**

- A third measure fitted to the Wall: moves where the condition, status or finds differ from the place before.
- The forts along the Wall (64), told with the milecastles.
- WallCAP credited (CC BY 4.0).
- The road network north and south of the Wall (the Stanegate, Dere Street) for ways off it.

## Round three: a measure for the Wall, WallCAP credited, the roads off it

**What changed:**

- **A measure fitted to the Wall.** A move counts when the place reached is kept differently from the last (its kind, status, condition, ages or finds), or when its stage changes.
- **WallCAP credited.** The page's About credits only the Roman walk's own sources (`ROMAN_SOURCES`):
  - Digital Britannia, with the Rural Settlement of Roman Britain project;
  - WallCAP (CC BY 4.0: the Wall and the Vallum from files by Kathryn Murphy and Nicky Garland, with minor tweaks by Mike Haken; the milecastles from data by Kathryn Murphy; the GIS archive at doi.org/10.5284/1100071);
  - the borough's sources that work anywhere.

  The OpenStreetMap line goes where the map is not among the sources (`exportPage`'s `sources`).

- **The roads off the Wall.** The box now runs from Binchester to High Rochester, so Dere Street crosses the Wall, with the Stanegate and the Military Way beside it. A road's own name is told beside its start and end where they don't already say it:
  - “Binchester to Corbridge” (“Dere Street (post 1950, previously Watling Street)”);
  - “Carvoran to Carlisle” (“The Stanegate”).

**Results:**

| Measure                                                   | Wanted  | The Wall         | The South-East |
| --------------------------------------------------------- | ------- | ---------------- | -------------- |
| Places with two or more facts beyond a name               | 80%     | 74% (109 of 147) | 25% (21 of 85) |
| Sentences said again at the next place                    | 0       | 0                | 0              |
| Moves with a change on the stage (round one's, for roads) | 7 of 10 | 0 of 10          | 4 of 10        |
| Moves to a place kept differently, or on a changing stage | 7 of 10 | 9 of 10          | 9 of 10        |

**Reading them honestly:**

- **The new measure does not discriminate.** It scores the thin South-East as well as the Wall, since two different sites nearly always differ in kind. It is no test, and I would drop it.
- **The measure that separates them is still the first:** how much is known of each place. The Wall's share fell from 79% to 74% as the box took in Dere Street and the Stanegate, whose forts and settlements are told more thinly than the milecastles.
- **The Wall proper (milecastles and forts) carries a walk. The roads off it thin it out.**

**What that suggests:** a Wall walk keeps to the Wall, Bowness to Wallsend, about 118 places. The roads off it are offered as ways out, the walk's edge, not walked far.

## The map

Digital Britannia has no online map to link to: it is published as GIS files, and its own “How to use” page still says the content is coming soon. So `gps` draws the map itself, from the walk's own data (`core/adventure/drawing.ts`, `drawnAround`; a world's `drawing`):

- roads as sure as each is kept: solid for certain, dashed for probable, dotted for conjectured, barely there for no evidence;
- the Wall, drawn thick;
- the sites as dots, and the place ringed at the middle, 6 km to each edge, in the page's colours.

It is an image the page draws, asking no one for anything, so it shows on any screen and in the claude.ai preview, where the tiled map cannot. `gps on` keeps it above the walk, moved with each step. The Google Maps link stays beside it. The lines are thinned to a point every 100 m or so.

## Overlays worth trying

Each source below is a record someone keeps of the past, given as hearsay or, worked out, as now. Each needs its licence confirmed before use.

- **The Old World Drought Atlas** (Cook et al. 2015, NOAA). It reconstructs, from tree rings, how dry or wet each summer was, on a half-degree grid over Europe, for about two thousand years. It is the one source that gives a place a year's weather in Roman times: “The summer of AD 122 here, it is reckoned, was dry.” It is data, with provenance and its own uncertainty. It fits a time axis.
- **The Antonine Itinerary.** The Romans' own road book: the stations of Britain on fifteen routes, with the distances between them in Roman miles. It would let Guide set the Itinerary's distance beside the map's (“The road book gives XII miles; the line here runs 19 km.”). The two disagree, which suits Guide. Its text is ancient; a modern edition's figures would need checking for reuse.
- **Pleiades** (ancient places, CC BY). Roman names and when each place is attested, across the Roman world. A second account to set beside Digital Britannia's, and the two sometimes spell a name differently.
- **Roman Inscriptions of Britain** (RIB Online; an aggregator lists CC BY 4.0, to be confirmed on its own terms page). The full words and translations of the milestones and other stones near a site.
- **The sky then.** Astronomy Engine, which the walk already uses, can work out the sky for any date: the eclipses seen in Britain under Hadrian, where the planets stood in AD 122. It is worked out, not invented, and needs no data.
- **Today's weather.** It already works anywhere: the Wall in today's rain.

**A rule to decide first.** The borough's walk says no past day's weather is ever spoken, as weather is only ever for now. A reconstructed summer is not a day's weather, and it is said as hearsay with its source's uncertainty. But a Roman walk that speaks of the past is a choice about what the walk is. That is Benedict's choice, before it is code.
