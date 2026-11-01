import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { whatsNew } from './changes';

// An invented changelog, in the repository's own form.
const log = `# Changelog

Some words about the log.

## 2026-12-02

### For walkers

- You can now walk the whole of Inventa.
- Guide reads the words on \`markers\`.

### Under the hood

- The engine was split in two.

## 2026-11-20

### Under the hood

- Only plumbing this time.

## 2026-11-14

### For walkers

- A new way in.

## 2026-11-01

### For walkers

- The first walk.
`;

describe('whatsNew', () => {
	it('takes the walkers’ lines of the latest dates, newest first, and leaves the plumbing out', () => {
		expect(whatsNew(log, 2)).toEqual([
			{
				date: '2026-12-02',
				items: ['You can now walk the whole of Inventa.', 'Guide reads the words on `markers`.']
			},
			{ date: '2026-11-14', items: ['A new way in.'] }
		]);
	});

	it('gives nothing for a log with no walkers’ lines', () => {
		expect(whatsNew('# Changelog\n\n## 2026-11-20\n\n### Under the hood\n\n- Plumbing.\n')).toEqual(
			[]
		);
	});

	it('finds what is new in the repository’s own changelog, so a slip in its form cannot empty the page', () => {
		const news = whatsNew(readFileSync('CHANGELOG.md', 'utf8'));
		expect(news).toHaveLength(3);
		for (const day of news) expect(day.items.length).toBeGreaterThan(0);
		expect(news.map((d) => d.date)).toEqual([...news.map((d) => d.date)].sort().reverse());
	});
});
