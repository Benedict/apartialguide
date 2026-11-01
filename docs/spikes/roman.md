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
- `npm run roman:spike` (`BRITANNIA_GPKG=…`). It builds the South-East (`ROMAN_BOX`, default -1.6,50.6,1.6,51.9), plays ten moves from London into `build/roman/transcript.md`, and writes one playable page, `build/roman/roman.html`, which `npm run smoke` passes. The ten moves are in `roman-transcript.md`.

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
