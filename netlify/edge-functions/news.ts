// The news function as a Netlify Edge Function, on the same site as the page, so the page reads it as
// its own. Its answer is cached at the edge (cache: 'manual', with the handler's headers), so GDELT
// is asked at most once a quarter of an hour, however many read. The logic is the shared handler's.
import { newsHandler } from '../../src/lib/server/news.ts';

// The map's own place, by the name the news would give it.
const PLACE = 'Croydon';

export default (request: Request) =>
	newsHandler(request, { PLACE, ALLOWED_ORIGIN: new URL(request.url).origin });

export const config = { path: '/api/news', cache: 'manual' };
