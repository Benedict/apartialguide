import { readFileSync } from 'node:fs';
import type { ProseModel } from '../core/narration';
import type { Prompt } from '../core/render/prompt';

/**
 * Prose written elsewhere, such as in a Claude Code session, kept in a file by prompt key, and read
 * back through the same port as any model, so it passes the same guards before it is stored.
 */
export class WrittenProse implements ProseModel {
	readonly name = 'written in a Claude Code session';
	private readonly prose: Record<string, string>;

	constructor(path: string) {
		this.prose = JSON.parse(readFileSync(path, 'utf8'));
	}

	async write(_prompt: Prompt, about?: { stop: string; key: string }): Promise<string | undefined> {
		return about ? this.prose[about.key]?.trim() || undefined : undefined;
	}
}
