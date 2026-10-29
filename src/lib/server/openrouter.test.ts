import { describe, expect, it } from 'vitest';
import { OpenRouterProse } from './openrouter';

const prompt = { system: 'Invented voice.', user: 'Invented facts.' };
const answer = (content: string, finish = 'stop') =>
	new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: finish }] }));

describe('OpenRouterProse (other providers’ models, through OpenRouter)', () => {
	it('sends the voice and the facts to the named model, refusing providers that keep prompts', async () => {
		const sent: { url: string; init: RequestInit }[] = [];
		const model = new OpenRouterProse('invented/model', 'key-123', async (url, init) => {
			sent.push({ url: String(url), init: init! });
			return answer('  Invented prose.  ');
		});
		expect(await model.write(prompt)).toBe('Invented prose.');
		expect(sent[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
		expect((sent[0].init.headers as Record<string, string>).Authorization).toBe('Bearer key-123');
		const body = JSON.parse(String(sent[0].init.body));
		expect(body).toMatchObject({
			model: 'invented/model',
			messages: [
				{ role: 'system', content: 'Invented voice.' },
				{ role: 'user', content: 'Invented facts.' }
			],
			provider: { data_collection: 'deny' }
		});
		expect(model.name).toBe('invented/model (via OpenRouter)');
	});

	it('declines when the answer was cut off, refused, or never came', async () => {
		expect(
			await new OpenRouterProse('m', 'k', async () => answer('Half a sen', 'length')).write(prompt)
		).toBeUndefined();
		expect(
			await new OpenRouterProse('m', 'k', async () => new Response('busy', { status: 429 })).write(
				prompt
			)
		).toBeUndefined();
		expect(
			await new OpenRouterProse('m', 'k', async () => answer('')).write(prompt)
		).toBeUndefined();
	});

	it('needs a key', () => {
		expect(() => new OpenRouterProse('m', '')).toThrow(/OPENROUTER_API_KEY/);
	});
});
