import type { Point } from './drawing';

/**
 * Every walk's line, kept between visits so all a reader's walks can be drawn together: where the
 * map puts each stop the reader came to, in order. Never the reader's own position. Kept in the
 * reader's browser (`browser/trails.ts`), or in memory in tests.
 */
export interface TrailKeeper {
	/** Every walk kept, by its id. */
	load(): Map<string, Point[]>;
	put(id: string, trail: Point[]): void;
}

export class MemoryTrails implements TrailKeeper {
	private kept = new Map<string, Point[]>();
	load(): Map<string, Point[]> {
		return new Map([...this.kept].map(([id, t]) => [id, t.map((p) => [...p] as Point)]));
	}
	put(id: string, trail: Point[]): void {
		this.kept.set(
			id,
			trail.map((p) => [...p] as Point)
		);
	}
}
