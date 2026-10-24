import { describe, expect, it } from 'vitest';
import { AnthropicProse, type MessagesClient } from './anthropic';

const prompt = { system: 'You are Guide.', user: 'Where the reader stands: Long Street.' };

function fakeClient(response: object) {
	const requests: object[] = [];
	const client: MessagesClient = {
		beta: { messages: { create: async (body: object) => (requests.push(body), response) } }
	} as unknown as MessagesClient;
	return { client, requests };
}

describe('AnthropicProse', () => {
	it('asks the configured model, with the system prompt cached and refusal fallbacks on', async () => {
		const { client, requests } = fakeClient({
			stop_reason: 'end_turn',
			content: [{ type: 'text', text: 'Long Street.' }]
		});
		await new AnthropicProse(client, 'claude-opus-5-5').write(prompt);
		expect(requests[0]).toMatchObject({
			model: 'claude-opus-5-5',
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			output_config: { effort: 'medium' },
			system: [{ type: 'text', text: 'You are Guide.', cache_control: { type: 'ephemeral' } }],
			messages: [{ role: 'user', content: 'Where the reader stands: Long Street.' }]
		});
	});

	it('returns the text of the reply', async () => {
		const { client } = fakeClient({
			stop_reason: 'end_turn',
			content: [
				{ type: 'thinking', thinking: '' },
				{ type: 'text', text: ' Long Street.\n\nNothing else. ' }
			]
		});
		expect(await new AnthropicProse(client, 'm').write(prompt)).toBe(
			'Long Street.\n\nNothing else.'
		);
	});

	it('returns nothing when the model declines', async () => {
		const { client } = fakeClient({ stop_reason: 'refusal', content: [] });
		expect(await new AnthropicProse(client, 'm').write(prompt)).toBeUndefined();
	});

	it('returns nothing when the reply was cut off', async () => {
		const { client } = fakeClient({
			stop_reason: 'max_tokens',
			content: [{ type: 'text', text: 'Long Str' }]
		});
		expect(await new AnthropicProse(client, 'm').write(prompt)).toBeUndefined();
	});
});
