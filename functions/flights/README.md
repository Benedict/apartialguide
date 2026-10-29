# The flights function

adsb.lol tells which aircraft are overhead, but sends no header letting a page on another site read
the answer. This small function asks adsb.lol about the map's own place, keeps only what the page
needs (call sign, height, heading, position), and passes it on with that header.

It asks about one fixed place, set in `wrangler.toml`, so it cannot be used to ask about anywhere
else. It needs no key. The logic is `src/lib/server/flights.ts`, tested with the rest.

## Deploy on Cloudflare Workers (free plan)

1. `npx wrangler login`
2. `cd functions/flights && npx wrangler deploy`
3. Copy the URL it prints (such as `https://partial-guide-flights.<you>.workers.dev`).
4. In the repository: Settings → Secrets and variables → Actions → Variables → New variable,
   `FLIGHTS_URL`, that URL. The next Pages build asks it whenever a reader looks up.

Any other FaaS that runs a standard `fetch(request)` handler (Deno Deploy, Netlify or Vercel Edge
Functions) can run `flightsHandler` too, with the same four settings.

Aircraft data © adsb.lol contributors, Open Database License (ODbL).
