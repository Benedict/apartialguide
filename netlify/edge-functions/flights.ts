// The flights function as a Netlify Edge Function, on the same site as the page, so the page reads
// it as its own (see functions/flights/README.md). The logic is the shared handler's.
import { flightsHandler } from '../../src/lib/server/flights.ts';

// The map's own place: the start of the walk. Never the reader's.
const PLACE = { LATITUDE: '51.3799', LONGITUDE: '-0.0743', RADIUS_NM: '6' };

export default (request: Request) =>
	flightsHandler(request, { ...PLACE, ALLOWED_ORIGIN: new URL(request.url).origin });

export const config = { path: '/api/flights' };
