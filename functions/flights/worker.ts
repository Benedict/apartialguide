// The flights function as a Cloudflare Worker. Its settings are in wrangler.toml; see README.md.
import { flightsHandler, type FlightsConfig } from '../../src/lib/server/flights';

export default {
	fetch: (request: Request, env: FlightsConfig) => flightsHandler(request, env)
};
