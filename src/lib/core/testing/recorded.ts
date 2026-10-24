import type { ProseModel } from '../narration';
import type { Prompt } from '../render/prompt';

/** A stand-in model for tests: answers from a function, and keeps every prompt it was given. */
export class RecordedModel implements ProseModel {
	readonly name = 'recorded';
	readonly prompts: Prompt[] = [];

	constructor(private readonly answer: (prompt: Prompt) => string | undefined) {}

	async write(prompt: Prompt): Promise<string | undefined> {
		this.prompts.push(prompt);
		return this.answer(prompt);
	}
}
