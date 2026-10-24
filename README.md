# Addiscombe Narrator

A text "street view" of Addiscombe, Croydon, read in the browser. One narrator, Guide, walks the streets from OpenStreetMap data, and where the data disagrees, decays or falls silent, so does Guide.

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
