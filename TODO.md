# To do (Benedict)

Steps only you can take. Ideas for later phases live in `BACKLOG.md`.

## Keys and workflows

- [ ] **Re-run Narrate.** Guide's voice changed (hearsay instead of "by another account"), so the prose written ahead of time is stale. Until then the walk falls back to the template. Go to Actions → Narrate → Run workflow. It republishes the site when done.
- [ ] **Energy certificate keys.** Register at <https://epc.opendatacommunities.org/>. Then add two repository secrets (Settings → Secrets and variables → Actions):
  - `EPC_EMAIL`
  - `EPC_API_KEY`
- [ ] **Geograph key.** Register at <https://www.geograph.org.uk/>, ask for an API key, and add it as `GEOGRAPH_API_KEY`.
- [ ] **Fetch them.** Set `SOURCES=epc,geograph` in `data/records/request.env` and push to a branch. The Records workflow commits what it finds. If the energy certificate register has moved to its new service, tell Claude what the fetch log says.

- [ ] **Deploy the flights function**, so `look up` can tell the aircraft overhead. See `functions/flights/README.md`: `npx wrangler login`, then `npx wrangler deploy` in `functions/flights`. Then add the URL it prints as a repository **variable** (not a secret) called `FLIGHTS_URL`. Any FaaS that runs a standard `fetch` handler will do.

## Decisions

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
