/**
 * What the hints remember, across walks: the commands the reader has used, the hints given, and
 * whether hints are off. Once every hint is given, none comes of its own again, on any walk.
 */
export interface HintMemory {
	used: string[];
	given: string[];
	off: boolean;
}

/** Where the hints' memory is kept: the reader's browser, or memory in tests. */
export interface HintKeeper {
	load(): HintMemory;
	save(memory: HintMemory): void;
}

export const FRESH: HintMemory = { used: [], given: [], off: false };

export class MemoryHints implements HintKeeper {
	private kept: HintMemory = structuredClone(FRESH);
	load(): HintMemory {
		return structuredClone(this.kept);
	}
	save(memory: HintMemory): void {
		this.kept = structuredClone(memory);
	}
}
