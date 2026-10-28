import { keeper } from '../keepers';
import { isElsewhere } from '../tensions';
import type { Scene } from '../scene';
import { AdventureRenderer, exitsLine } from './adventure';
import { brokenNames, buildPrompt, promptKey } from './prompt';
import type { Renderer, Room } from './renderer';

/** Prose written ahead of time for one stop, keyed by its prompt. */
export interface NarrationEntry {
	paragraphs: string[];
	model: string;
	written: string;
}

export type NarrationStore = Record<string, NarrationEntry>;

/**
 * Uses prose written ahead of time where a stop has some, and the template elsewhere.
 * The title, the exits line, the things to examine and the closer look always come from the
 * template, so the game behaves the same whichever wrote the description.
 */
export class CachedRenderer implements Renderer {
	constructor(
		private readonly store: NarrationStore,
		private readonly fallback: Renderer = new AdventureRenderer()
	) {}

	render(scene: Scene): Room {
		const room = this.fallback.render(scene);
		const entry = this.store[promptKey(buildPrompt(scene))];
		if (
			!entry ||
			!keepsBrokenNames(scene, entry.paragraphs) ||
			!namesNoSource(scene, entry.paragraphs)
		)
			return room;
		return { ...room, paragraphs: [...entry.paragraphs, exitsLine(scene.exits)] };
	}
}

/** Whether every broken name at the stop appears exactly as found, not glued to a repair. */
export function keepsBrokenNames(scene: Scene, paragraphs: readonly string[]): boolean {
	const text = paragraphs.join('\n');
	return scene.beats
		.flatMap(brokenNames)
		.every((name) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}`, 'u').test(text));
}

/**
 * Whether the prose leaves every source unnamed: Wikidata, and the keeper of each other account at
 * the stop, unless that name is also one of the map's own facts there (a tram's operator, say).
 */
export function namesNoSource(scene: Scene, paragraphs: readonly string[]): boolean {
	const text = paragraphs.join('\n').toLowerCase();
	const facts = scene.beats.flatMap((b) => b.facts);
	const mapValues = new Set(
		facts.filter((f) => !isElsewhere(f)).map((f) => f.claim.value.toLowerCase())
	);
	const keepers = new Set([
		'wikidata',
		...facts.filter(isElsewhere).map((f) => keeper(f.source).toLowerCase())
	]);
	return [...keepers].every((k) => mapValues.has(k) || !text.includes(k));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
