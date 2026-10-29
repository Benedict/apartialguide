import type { ProseModel } from '../core/narration';
import type { Prompt } from '../core/render/prompt';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Writes a stop's prose with another provider's model, through OpenRouter: for trying other models
 * against the same guards. A cut-off, refused or missing answer returns nothing, so the stop keeps
 * its template text. Providers that keep or train on prompts are refused. Claude is better asked
 * directly (`anthropic.ts`).
 */
export class OpenRouterProse implements ProseModel {
	readonly name: string;

	constructor(
		private readonly model: string,
		private readonly key: string = process.env.OPENROUTER_API_KEY ?? '',
		private readonly post: typeof fetch = fetch
	) {
		if (!key) throw new Error('OpenRouterProse needs OPENROUTER_API_KEY');
		this.name = `${model} (via OpenRouter)`;
	}

	async write(prompt: Prompt): Promise<string | undefined> {
		try {
			const res = await this.post(ENDPOINT, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.key}`,
					'Content-Type': 'application/json',
					'X-Title': 'A Partial Guide'
				},
				body: JSON.stringify({
					model: this.model,
					max_tokens: 4000,
					messages: [
						{ role: 'system', content: prompt.system },
						{ role: 'user', content: prompt.user }
					],
					provider: { data_collection: 'deny' }
				})
			});
			if (!res.ok) return undefined;
			const answer = (await res.json()) as {
				choices?: { message?: { content?: string }; finish_reason?: string }[];
			};
			const choice = answer.choices?.[0];
			if (choice?.finish_reason !== 'stop') return undefined;
			return choice.message?.content?.trim() || undefined;
		} catch {
			return undefined;
		}
	}
}
