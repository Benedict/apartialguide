import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WrittenProse } from './written';

const prompt = { system: 'Invented voice.', user: 'Invented facts.' };

describe('WrittenProse (prose written in a session, read back by key)', () => {
	it('answers with the prose written for the key it is asked about', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'written-'));
		const file = join(dir, 'prose.json');
		writeFileSync(file, JSON.stringify({ 'v14-abc': 'Invented prose.' }));
		const model = new WrittenProse(file);
		expect(await model.write(prompt, { stop: 'n1', key: 'v14-abc' })).toBe('Invented prose.');
	});

	it('declines a stop it has no prose for', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'written-'));
		const file = join(dir, 'prose.json');
		writeFileSync(file, '{}');
		expect(
			await new WrittenProse(file).write(prompt, { stop: 'n1', key: 'v14-zzz' })
		).toBeUndefined();
		expect(await new WrittenProse(file).write(prompt)).toBeUndefined();
	});

	it('is named for whoever wrote it, when they say, so the store keeps who wrote each piece', () => {
		const dir = mkdtempSync(join(tmpdir(), 'written-'));
		const file = join(dir, 'prose.json');
		writeFileSync(file, '{}');
		expect(new WrittenProse(file, 'Ada Inventa').name).toBe('written by Ada Inventa');
		expect(new WrittenProse(file).name).toBe('written in a Claude Code session');
	});
});
