import Anthropic from '@anthropic-ai/sdk';
import type { ProseModel } from '../core/narration';
import type { Prompt } from '../core/render/prompt';

export type MessagesClient = Pick<Anthropic, 'beta'>;

export const DEFAULT_MODEL = 'claude-opus-5-5';

/**
 * Writes a stop's prose with a Claude model. A refused or cut-off reply returns nothing, so the
 * stop keeps its template text. On a refusal the server first retries on a fallback model.
 */
export class AnthropicProse implements ProseModel {
	constructor(
		private readonly client: MessagesClient = new Anthropic(),
		readonly name: string = process.env.NARRATOR_MODEL ?? DEFAULT_MODEL
	) {}

	async write(prompt: Prompt): Promise<string | undefined> {
		const response = await this.client.beta.messages.create({
			model: this.name,
			max_tokens: 16000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			output_config: { effort: 'medium' },
			system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
			messages: [{ role: 'user', content: prompt.user }]
		});
		if (response.stop_reason !== 'end_turn') return undefined;
		const text = response.content
			.flatMap((block) => (block.type === 'text' ? [block.text] : []))
			.join('')
			.trim();
		return text || undefined;
	}
}
