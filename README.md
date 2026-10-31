# A Partial Guide

A text adventure of the real world, built from open data, starting with Croydon: [apartialguide.com](https://apartialguide.com). One narrator, Guide, walks the streets from OpenStreetMap data, and where the data disagrees, decays or falls silent, so does Guide.

## Run it

```sh
npm ci
BBOX=minLon,minLat,maxLon,maxLat npm run snapshot   # once, to fetch a dated snapshot
cp .env.example .env                                # point SNAPSHOT_PATH at it
npm run dev
```

## Test it

```sh
npm test
```

Unit tests cover the core. The Gherkin in `features/` holds the acceptance scenarios from the spec. The Lower Addiscombe Road scenarios need the snapshot of 24 October 2026 in `data/snapshots/`.

## Data

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database Licence.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): wrong data is best fixed at its source, misread prose has an issue form, and every commit is signed off under the [DCO](DCO).

## Licence

The code is under the [GNU Affero General Public License, version 3 or later](LICENSE), and Guide's prose in `data/narration/` under [CC BY-SA 4.0](data/narration/LICENSE.md). The data keeps its sources' own licences, credited on the site's About page; Commit Mono is under the SIL Open Font License.
