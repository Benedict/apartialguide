import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** The env a workflow sets for the world it builds, as KEY → value, from every step. */
function worldEnv(file: string): Record<string, string> {
	const text = readFileSync(`.github/workflows/${file}`, 'utf8');
	const keys = [
		'SNAPSHOT_PATH',
		'HISTORY_DIR',
		'WIKIDATA_DIR',
		'RECORDS_DIR',
		'START_AT',
		'NARRATION_PATH'
	];
	return Object.fromEntries(
		keys.flatMap((k) => {
			const m = text.match(new RegExp(`^\\s+${k}: (.+)$`, 'm'));
			return m ? [[k, m[1].trim()]] : [];
		})
	);
}

describe('the workflows', () => {
	it('write prose for the same world the published page plays', () => {
		// Prose is found by a key made from each stop's scene: a different world finds none of it.
		const narrate = worldEnv('narrate.yml');
		const pages = worldEnv('pages.yml');
		expect(narrate).toEqual(pages);
		expect(pages.NARRATION_PATH).toBeTruthy();
	});

	it('publish the page again once prose is written', () => {
		expect(readFileSync('.github/workflows/narrate.yml', 'utf8')).toContain(
			'gh workflow run pages.yml'
		);
	});
});
