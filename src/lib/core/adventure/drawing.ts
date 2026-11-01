import type { LatLon } from '../geo';

/**
 * A map drawn from the walk's own data, for a world that has no map of tiles to show, such as the
 * Roman walk's: its lines (roads, as sure as each is kept, and walls) and its sites, drawn by the page
 * itself as an image, asking no one for anything.
 */
export interface Drawing {
	lines: {
		kind: 'road' | 'wall';
		/** 3 certain, 2 probable, 1 conjectured, 0 no evidence. */ sure?: number;
		points: LatLon[];
	}[];
	sites: { name: string; at: LatLon }[];
}

const SIZE = 320;
const esc = (t: string) =>
	t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** How a road is drawn, by how sure its line is: solid, dashed, dotted, or barely there. */
const DASH: Record<number, string> = { 2: '7 4', 1: '2 4', 0: '1 6' };

/** The drawing around a place, `metres` from its middle to each edge, the place marked at the middle. */
export function drawnAround(drawing: Drawing, at: LatLon, label: string, metres = 6000): string {
	const [lat0, lon0] = at;
	const perDegLat = 111_320;
	const perDegLon = 111_320 * Math.cos((lat0 * Math.PI) / 180);
	const scale = SIZE / 2 / metres;
	const xy = ([lat, lon]: LatLon): [number, number] => [
		SIZE / 2 + (lon - lon0) * perDegLon * scale,
		SIZE / 2 - (lat - lat0) * perDegLat * scale
	];
	const inFrame = ([x, y]: [number, number], margin = 0) =>
		x >= -margin && x <= SIZE + margin && y >= -margin && y <= SIZE + margin;
	const n = (v: number) => +v.toFixed(1);

	const paths = drawing.lines
		.map((line) => {
			const pts = line.points.map(xy);
			if (!pts.some((p) => inFrame(p, SIZE / 4))) return '';
			const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join('');
			const wall = line.kind === 'wall';
			const dash =
				!wall && line.sure !== undefined && line.sure < 3
					? ` stroke-dasharray="${DASH[line.sure]}"`
					: '';
			return `<path data-kind="${line.kind}"${wall ? '' : ` data-sure="${line.sure ?? ''}"`} d="${d}" fill="none" stroke="var(--ink, #d4d4cc)" stroke-width="${wall ? 4 : 2}"${dash} stroke-linecap="round"/>`;
		})
		.filter(Boolean)
		.join('');
	const sites = drawing.sites
		.map((s) => ({ s, p: xy(s.at) }))
		.filter(({ p }) => inFrame(p))
		.map(
			({ s, p: [x, y] }) =>
				`<circle cx="${n(x)}" cy="${n(y)}" r="3" fill="var(--muted, #8e8e86)"><title>${esc(s.name)}</title></circle>`
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${esc(label)}" style="width:100%;height:100%;background:var(--paper, #000)">${paths}${sites}<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="7" fill="none" stroke="var(--accent, #fff)" stroke-width="3"/></svg>`;
}
