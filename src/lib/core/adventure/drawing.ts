/**
 * The walk drawn, plain and unlabelled, the way a guidebook draws a route: one line for each walk,
 * north up, the shape true, in the page's own colour, and nothing else. No street, no name, no
 * word: what the line looks like is for the reader to see, never for Guide to say.
 */
export type Point = [latitude: number, longitude: number];

/** The longest side of the drawing, in its own units. */
const SIDE = 1000;
const MARGIN = 40;

const round = (n: number) => Math.round(n * 10) / 10;

/** The walks as one SVG, or nothing where no walk goes anywhere. */
export function drawWalks(walks: readonly (readonly Point[])[]): string | undefined {
	const drawn = walks.filter((w) => w.length > 1);
	if (!drawn.length) return undefined;
	const all = drawn.flat();
	const middle = all.reduce((sum, [lat]) => sum + lat, 0) / all.length;
	// Longitude narrows towards the poles: a degree east is cos(latitude) of a degree north.
	const squeeze = Math.cos((middle * Math.PI) / 180);
	const xs = all.map(([, lon]) => lon * squeeze);
	const ys = all.map(([lat]) => lat);
	const [left, right, bottom, top] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys)
	];
	const span = Math.max(right - left, top - bottom) || 1;
	const scale = (SIDE - 2 * MARGIN) / span;
	const width = Math.round((right - left) * scale + 2 * MARGIN);
	const height = Math.round((top - bottom) * scale + 2 * MARGIN);
	const line = (walk: readonly Point[]) =>
		walk
			.map(
				([lat, lon]) =>
					`${round((lon * squeeze - left) * scale + MARGIN)},${round((top - lat) * scale + MARGIN)}`
			)
			.join(' ');
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Your walk, drawn">`,
		...drawn.map(
			(walk) =>
				`<polyline points="${line(walk)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
		),
		'</svg>'
	].join('');
}
