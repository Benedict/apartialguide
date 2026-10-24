import { destination, type LatLon } from '../geo';
import type { OsmData, OsmElement, Tags } from '../osm';

/**
 * Builds small invented street networks for tests.
 * Nothing here describes the real Addiscombe: real places come only from dated snapshots.
 */
export class SyntheticMap {
	static readonly ORIGIN: LatLon = [51.38, -0.07];

	private nextId = 1;
	private readonly elements: OsmElement[] = [];

	node(at: LatLon, tags?: Tags): number {
		const id = this.nextId++;
		this.elements.push({ type: 'node', id, lat: at[0], lon: at[1], tags });
		return id;
	}

	/** A node `metres` from `from` on `bearingDeg`. */
	nodeFrom(from: LatLon, bearingDeg: number, metres: number, tags?: Tags): number {
		return this.node(destination(from, bearingDeg, metres), tags);
	}

	way(nodes: number[], tags: Tags = { highway: 'residential' }): number {
		const id = this.nextId++;
		this.elements.push({ type: 'way', id, nodes, tags });
		return id;
	}

	/** A closed building outline, as a square of side `metres` centred on `centre`. */
	building(centre: LatLon, metres: number, tags: Tags = { building: 'yes' }): number {
		const half = (metres / 2) * Math.SQRT2;
		const corners = [45, 135, 225, 315].map((b) => this.nodeFrom(centre, b, half));
		return this.way([...corners, corners[0]], tags);
	}

	position(id: number): LatLon {
		const n = this.elements.find((e) => e.id === id);
		if (n?.type !== 'node') throw new Error(`no node ${id}`);
		return [n.lat, n.lon];
	}

	toData(): OsmData {
		return { elements: [...this.elements] };
	}
}
