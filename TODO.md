# To do (Benedict)

Steps only you can take. Ideas for later phases live in `BACKLOG.md`.

## Keys and workflows

- [ ] **A mailing list for areas to come.** At the edge of an area not open yet, the page can link to a sign-up. Choose a provider (Buttondown, a Netlify form, Mailchimp…), make a sign-up page, and add its address as the repository **variable** `SIGNUP_URL`. Collecting addresses needs the privacy policy below first.
- [ ] **Sponsoring an area.** You want people to be able to sponsor an area's prose. Decide what a sponsor gets (a credit on the About page, or on the area's edge note?), how they pay, and whether a sponsor's name may appear in the walk at all. Guide never names sources, so a credit belongs to the page, not to Guide.

- [ ] **Remove the `CROYDON_WALK` variable.** The walk at the root is now the whole borough, so `/croydon/` is no longer built.

- [ ] **Re-narrate.** The walk now stops only at junctions and named places, so every stop is new and the prose written before no longer matches any of them: the walk shows the template until it is rewritten. There are 384 busier stops now (was 1,094). Either run the Narrate workflow with `NARRATE_ONLY=busier` (API, roughly $8–15), or ask Claude to narrate them in a session on your Max plan.
- [ ] **Energy certificate keys.** Register at <https://epc.opendatacommunities.org/>. Then add two repository secrets (Settings → Secrets and variables → Actions):
  - `EPC_EMAIL`
  - `EPC_API_KEY`
- [ ] **Geograph key.** Register at <https://www.geograph.org.uk/>, ask for an API key, and add it as `GEOGRAPH_API_KEY`.
- [ ] **Fetch them.** Set `SOURCES=epc,geograph` in `data/records/request.env` and push to a branch. The Records workflow commits what it finds. If the energy certificate register has moved to its new service, tell Claude what the fetch log says.

- [ ] **Deploy the flights function**, so `look up` can tell the aircraft overhead. See `functions/flights/README.md`: `npx wrangler login`, then `npx wrangler deploy` in `functions/flights`. Then add the URL it prints as a repository **variable** (not a secret) called `FLIGHTS_URL`. Any FaaS that runs a standard `fetch` handler will do.

- [ ] **Send the Bomb Sight letter.** It's drafted in `docs/letters/bomb-sight.md`. Check that Dr Kate Jones is still the right person: she directed the project at Portsmouth in 2011–13 and may have moved.
- [ ] **Digital Britannia's licence and files.** Open <https://roadsofromanbritain.org/digital-britannia/downloads.html>; this session can't reach that site. Check whether the licence is CC BY-NC 4.0, as the viewer's author reports, or "under copyright", as the RRRA's press release says. If it's CC BY-NC, download the **GeoJSON** layers (roads, settlement, military, camps, milestones) in longitude and latitude, put them in a folder, and tell Claude where. `look beyond` then tells them. If they come only in British National Grid, say so; they need converting first.

- [ ] **OpenRouter key, to compare models.** Create a key at <https://openrouter.ai/>, add some credit (a comparison of four models on 25 stops costs pennies), and add it as the repository secret `OPENROUTER_API_KEY`. Then Actions → Compare models → Run workflow; the report is attached to the run.

- [ ] **Netlify.** The site moves from GitHub Pages to Netlify once two settings exist; until then it keeps publishing to Pages.
  1. At app.netlify.com, "Let's create your new project": not "Import a Git repository" (Netlify would then build it itself, without the smoke check), but **Upload your project files**: drop any one HTML file. The workflow replaces it with the real site. Then Project configuration → General → copy the **Project ID** (the workflow calls it the site ID).
  2. User settings → Applications → Personal access tokens → New access token. Copy it.
  3. In the repository, Settings → Secrets and variables → Actions: a **variable** `NETLIFY_SITE_ID` (the Project ID), and a **secret** `NETLIFY_AUTH_TOKEN` (the token).
  4. Run the Deploy workflow (Actions → Deploy → Run workflow), or merge anything. Its summary gives the URL.
  5. Once the Netlify site plays, Settings → Pages → turn GitHub Pages off, and give the Netlify URL to anyone who has the old one. `FLIGHTS_URL` and the Cloudflare worker are then no longer needed: flights answer from the site itself.
- [ ] **Privacy policy.** The Website Specification requires one, linked from every page's footer, naming who is responsible for the site (the controller), a postal address and a contact for privacy questions. The About page already says what is counted and why; the rest only you can give. Say what name, address and contact to use, and whether a contact email may be public (also wanted for `/.well-known/security.txt`).
- [ ] **Site address.** Add the repository **variable** `SITE_URL` = `https://apartialguide.com` (no `www.`: Netlify redirects `www.` to it, so that is the address search engines and link previews should be given). With it, a shared link shows the logo, and the site names its canonical addresses and sitemap.
- [ ] **Google Analytics.** Create a GA4 property for the site, then add its measurement ID (`G-…`) as a repository **variable** (not a secret) called `GA_MEASUREMENT_ID` (Settings → Secrets and variables → Actions → Variables), and run the Deploy workflow. Until then nothing is counted and no one is asked. In GA, under Admin → Data retention, consider the shortest retention, and leave Google signals off.

## Decisions

- [ ] **Is the piece non-commercial, for good?** Bomb Sight and Digital Britannia both forbid commercial use. An exhibition with a fee, or a sale or commission, would breach both.

- [ ] **Geograph's licence.** CC BY-SA asks for each photographer's name. Do you want each photographer named where the photograph is told, or Geograph left out (`LEAVE_OUT=geograph`)?
- [ ] **Which sources the walk uses.** List any to leave out on `LEAVE_OUT=` in `data/records/use.env`, comma-separated: `bench`, `wildlife`, `postcode`, `company`, `hygiene`, `listed`, `tree`, `planning`, `plaque`, `price`, `crime`, `trees`, `ward`, `flood`, `floodzone`, `epc`, `geograph`.
- [ ] **The edge of the map.** Crop to the Addiscombe East and West wards, or keep the wider walk and let Guide tell the boundaries as now?
- [ ] **Auster step 3.** Answer the brief's open questions so the drawn route can be built.

## Words

- [ ] **About page.** A few lines about you, and a link if wanted.

## The Blitz bomb census

- [ ] **Let Claude read the sources.** These sessions can't reach `blitzbombcensusmaps.wordpress.com` or `bombsight.org`. Add both under Allowed domains in the cloud environment's network settings (<https://code.claude.com/docs/en/cloud-environments#network-access>), then ask again. Claude can then say whether the data can be downloaded, and on what terms.
- [ ] **Or ask for the data.** Bomb Sight is a University of Portsmouth project. Earlier research found no download, and a non-commercial licence. Write to the project for the Croydon points and the terms of reuse.

## Optional

- [ ] **Civilian war dead.** The CWGC's records need a written licence. Write to them if you want the dead of Addiscombe told.
- [ ] **Check the live site** on your phone after each merge: <https://benedict.github.io/osm-text-adventure/>.
