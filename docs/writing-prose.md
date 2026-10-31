# Writing a place

Guide tells most places from a template, put together by the code from the facts there. At the busier places it speaks in prose written ahead of time. Most of that was written by an AI, but anyone can write a place, and the people who do are credited by name on the site's About page.

## What a place's prose must do

Guide says only what the sources say. Your prose is checked against the facts of its place, and refused if it says more.

- **Use only the facts.** Every noun, name, number and date must come from the place's facts. No smells, sounds, people, weather, history or detail the facts don't give, however true you know it to be. The phrases around the facts are yours.
- **Speak broken names exactly as found.** A name like “est Bank” is quoted as it is, in curly quotes, never repaired or explained.
- **Give others' records as hearsay.** Ratings, sales, plaques and applications are kept by others, not the map: "they say", "it is said", "someone wrote down". Never name a source ("Food Standards Agency", "OpenStreetMap"); allude to them by what they do ("those who inspect kitchens").
- **Say what was as what was.** Something gone was on an older map; a survey date is when something was last recorded.
- **Keep to the shape.** 60 to 180 words, in two to four short paragraphs. Don't list the exits; the game prints them. At most one sentence may reach for what something means, and only with the facts' own nouns.
- **Don't repeat yourself, or the places nearby.** A run of six of your own words already used in two other places' prose is refused.

The full voice, with the five writers it borrows from (Wainwright, Defoe, Sinclair, Auster, Blake), is the system prompt in [`src/lib/core/render/prompt.ts`](../src/lib/core/render/prompt.ts). Read it before you write.

## Without git: the Write a place form

1. Walk to the place on [the site](https://apartialguide.com/walk/).
2. Type `plainly`. Guide tells the place again from the template alone: that is everything it has there, and all you may use. Copy it.
3. Type `gps`, and copy the link it gives.
4. Write your version, in Guide's voice, from what `plainly` said and nothing else.
5. Open an issue with the **Write a place** form, and paste in the link, what `plainly` said, your prose, and the name you'd like to be credited by.

The maintainer puts it through the same checks as any other prose, tells you what they refuse, if anything, and adds it with your name.

## With git: write it, check it, send it

You need Node 22 and a clone of the repository.

1. Set up, pointing at the borough's snapshot and the other sources:

   ```sh
   npm ci
   export SNAPSHOT_PATH=$(ls data/snapshots/croydon-*.json.gz | tail -1)
   export HISTORY_DIR=data/history WIKIDATA_DIR=data/wikidata RECORDS_DIR=data/records
   export NODE_OPTIONS=--max-old-space-size=6144
   ```

2. Ask for the places to write, nearest a point first (the `gps` link gives a place's latitude and longitude). `NARRATE_AREA` keeps to one open area, `NARRATE_ONLY=busier` to the places with something going on, and `NARRATE_LIMIT` says how many:

   ```sh
   START_AT=51.3799,-0.0743 NARRATE_AREA=Addiscombe NARRATE_ONLY=busier NARRATE_LIMIT=5 npm run narrate:prompts
   ```

   This writes `build/narrate/prompts.md`: Guide's voice, then one section per place, headed by its key (`## v16-…`), with its facts and what the places next to it already say. Only places with no prose yet are offered.

3. Write each place's prose into a JSON file of key to prose, paragraphs separated by a blank line (`\n\n`):

   ```json
   {
   	"v16-0123456789abcdef": "First paragraph.\n\nSecond paragraph."
   }
   ```

4. Put it through the checks, with the name you'd like to be credited by:

   ```sh
   PROSE_FROM=my-prose.json PROSE_BY="Your Name" NARRATE_AREA=Addiscombe NARRATE_ONLY=busier NARRATE_LIMIT=5 npm run narrate
   ```

   It says how many pieces it kept, and for each it refused, why: a word its facts don't hold, a repeated turn of phrase, a repaired name, a source named. Rewrite and run it again until it keeps them.

5. Commit `data/narration/addiscombe.json`, signed off (`git commit -s`), and open a pull request. The store keeps "written by Your Name" with each piece, and About credits everyone it names.

## Things to know

- **Prose is kept for the facts it was written from.** It is stored under a key worked out from everything known at the place. When the data there changes (a new snapshot, a new record), the old piece stops being shown and the place is told plainly until it is written again. That is by design: prose never outlives its facts.
- **To replace a piece already there,** open an issue saying what is wrong with it first; it is easier to drop one deliberately than to argue two versions.
- **Licence.** Prose you contribute is given under [CC BY-SA 4.0](../data/narration/LICENSE.md), like the rest. By signing off, or ticking the form's box, you confirm you wrote it yourself and may give it so; don't paste from guidebooks, Wikipedia or anywhere else.
