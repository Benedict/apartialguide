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

export interface OsmRelation extends OsmElementBase {
	type: 'relation';
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

	constructor(readonly data: OsmData) {
		for (const e of data.elements) {
			if (e.type === 'node') this.nodes.set(e.id, e);
			else if (e.type === 'way') this.ways.push(e);
		}
	}

	wayGeometry(way: OsmWay): [number, number][] {
		return way.nodes.flatMap((id) => {
			const n = this.nodes.get(id);
			return n ? [[n.lat, n.lon] as [number, number]] : [];
		});
	}
}
