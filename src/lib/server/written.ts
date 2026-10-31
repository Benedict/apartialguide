import { readFileSync } from 'node:fs';
import type { ProseModel } from '../core/narration';
import type { Prompt } from '../core/render/prompt';

/**
 * Prose written elsewhere, such as in a Claude Code session, kept in a file by prompt key, and read
 * back through the same port as any model, so it passes the same guards before it is stored.
 */
export class WrittenProse implements ProseModel {
	readonly name: string;
	private readonly prose: Record<string, string>;

	/** `by`: whoever wrote it (`PROSE_BY`), kept with each piece, so About can credit them. */
	constructor(path: string, by?: string) {
		this.prose = JSON.parse(readFileSync(path, 'utf8'));
		this.name = by?.trim() ? `written by ${by.trim()}` : 'written in a Claude Code session';
	}

	async write(_prompt: Prompt, about?: { stop: string; key: string }): Promise<string | undefined> {
		return about ? this.prose[about.key]?.trim() || undefined : undefined;
	}
}
