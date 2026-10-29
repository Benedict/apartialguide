import type { Fact } from '../facts';
import { bearing, compassLabel, distance, type LatLon } from '../geo';
import { height } from './sky';
import { distanceWords } from './words';

/** Facts gathered by subject, in the order they came, each as its claims. */
function bySubject(facts: readonly Fact[], prefix: string): Record<string, string>[] {
	const subjects = new Map<string, Record<string, string>>();
	for (const f of facts)
		if (f.subject.startsWith(prefix))
			subjects.set(f.subject, { ...subjects.get(f.subject), [f.claim.key]: f.claim.value });
	return [...subjects.values()];
}

const where = (altitude: string, azimuth: string) =>
	`${height(Number(altitude))} in the ${compassLabel(Number(azimuth))}`;

/** "A; B; and C", for clauses that carry their own commas. */
const clauses = (items: string[]) =>
	items.length < 3 ? items.join('; and ') : `${items.slice(0, -1).join('; ')}; and ${items.at(-1)}`;

/** "Saturn is up in the south-east, and Venus low in the west." Nothing when none is up. */
export function planetsLine(facts: readonly Fact[]): string | undefined {
	const planets = bySubject(facts, 'planet/').filter((p) => p.name);
	if (!planets.length) return undefined;
	const [first, ...rest] = planets.map((p) => `${p.name} ${where(p.altitude, p.azimuth)}`);
	const head = first.replace(/ (low|up|high) /, ' is $1 ');
	return `${[head, ...rest].join(', ').replace(/, ([^,]*)$/, ', and $1')}.`;
}

/** The satellites above the roofs, three at most, by their names as published. */
export function satellitesLine(facts: readonly Fact[]): string | undefined {
	const said = bySubject(facts, 'satellite/')
		.filter((s) => s.name)
		.slice(0, 3)
		.map(
			(s) =>
				`“${s.name}”, ${Number(s.height).toLocaleString('en-GB')} km up, ${where(s.elevation, s.azimuth)}`
		);
	if (!said.length) return undefined;
	if (said.length === 1) return `Above the roofs, ${said[0].replace(/^(“[^”]*”),/, '$1 passes,')}.`;
	return `Above the roofs pass ${clauses(said)}.`;
}

/** The aircraft overhead, three at most, by call sign, height in feet and heading. */
export function flightsLine(facts: readonly Fact[]): string | undefined {
	const said = bySubject(facts, 'flight/')
		.filter((a) => a.callsign)
		.slice(0, 3)
		.map(
			(a) =>
				`${a.callsign} at ${Number(a.altitude).toLocaleString('en-GB')} feet` +
				(a.track === undefined ? '' : `, heading ${compassLabel(Number(a.track))}`)
		);
	return said.length ? `Overhead, ${clauses(said)}.` : undefined;
}

const clock = (iso: string) =>
	new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/London'
	}).format(new Date(iso));

/** The nearest camera, from where the map puts this place, and what it last saw. */
export function cameraLines(
	facts: readonly Fact[],
	here: LatLon
): { lines: string[]; image?: { src: string; alt: string } } {
	const camera = bySubject(facts, 'camera/').find((c) => c.name && c.image);
	if (!camera) return { lines: ['No camera watches near here.'] };
	const there: LatLon = [Number(camera.latitude), Number(camera.longitude)];
	const when = camera.taken ? ` at ${clock(camera.taken)}` : '';
	return {
		lines: [
			`The nearest camera is at “${camera.name}”, ${distanceWords(distance(here, there))} to the ${compassLabel(bearing(here, there))}. This is what it saw${when}.`
		],
		image: { src: camera.image, alt: `What the camera at ${camera.name} saw` }
	};
}
