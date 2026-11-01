/** The subset of the OSM API 0.6 JSON format the project reads. */

export type Tags = Readonly<Record<string, string>>;

interface OsmElementBase {
	id: number;
	tags?: Tags;
	timestamp?: string;
	version?: number;
}

export interface OsmNode extends OsmElementBase {
	type: 'node';
	lat: number;
	lon: number;
}

export interface OsmWay extends OsmElementBase {
	type: 'way';
	nodes: number[];
}

/** One member of a relation: a node, way or relation, and the part it plays ("outer", "inner"). */
export interface OsmMember {
	type: 'node' | 'way' | 'relation';
	ref: number;
	role: string;
}

export interface OsmRelation extends OsmElementBase {
	type: 'relation';
	members?: OsmMember[];
}

export type OsmElement = OsmNode | OsmWay | OsmRelation;

export interface OsmData {
	elements: OsmElement[];
}

export const elementRef = (e: OsmElement) => `${e.type}/${e.id}`;

/** Indexed access to a snapshot. */
export class OsmIndex {
	readonly nodes = new Map<number, OsmNode>();
	readonly ways: OsmWay[] = [];
	/** Areas drawn as multipolygons. */
	readonly relations: OsmRelation[] = [];
	private readonly waysById = new Map<number, OsmWay>();

	constructor(readonly data: OsmData) {
		for (const e of data.elements) {
			if (e.type === 'node') this.nodes.set(e.id, e);
			else if (e.type === 'way') {
				this.ways.push(e);
				this.waysById.set(e.id, e);
			} else this.relations.push(e);
		}
	}

	/**
	 * A multipolygon's rings, each closed: its member ways joined end to end, whichever way each is
	 * drawn. A ring that does not close, as when a member lies beyond the map, is left out.
	 */
	relationRings(relation: OsmRelation): { outer: LatLon[][]; inner: LatLon[][] } {
		const ringsOf = (role: string) =>
			closedRings(
				(relation.members ?? [])
					.filter((m) => m.type === 'way' && (m.role || 'outer') === role)
					.map((m) => this.waysById.get(m.ref))
					.filter((w): w is OsmWay => !!w)
					.map((w) => w.nodes)
			)
				.map((ids) => ids.map((id) => this.nodes.get(id)))
				.filter((ring): ring is OsmNode[] => ring.every(Boolean))
				.map((ring) => ring.map((n) => [n.lat, n.lon] as LatLon));
		return { outer: ringsOf('outer'), inner: ringsOf('inner') };
	}

	wayGeometry(way: OsmWay): [number, number][] {
		return way.nodes.flatMap((id) => {
			const n = this.nodes.get(id);
			return n ? [[n.lat, n.lon] as [number, number]] : [];
		});
	}
}

type LatLon = [number, number];

/** Node lists joined end to end into closed rings; what does not close is dropped. */
function closedRings(parts: number[][]): number[][] {
	const left = parts.filter((p) => p.length > 1).map((p) => [...p]);
	const rings: number[][] = [];
	while (left.length) {
		let ring = left.shift()!;
		let grew = true;
		while (ring[0] !== ring.at(-1) && grew) {
			grew = false;
			for (let i = 0; i < left.length; i++) {
				const p = left[i];
				const end = ring.at(-1)!;
				if (p[0] === end) ring = [...ring, ...p.slice(1)];
				else if (p.at(-1) === end) ring = [...ring, ...p.slice(0, -1).reverse()];
				else continue;
				left.splice(i, 1);
				grew = true;
				break;
			}
		}
		if (ring.length > 3 && ring[0] === ring.at(-1)) rings.push(ring);
	}
	return rings;
}
