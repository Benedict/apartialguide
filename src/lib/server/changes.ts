/** What changed on one day, in the words written for those who walk it. */
export interface News {
	/** The day, as YYYY-MM-DD. */
	date: string;
	items: string[];
}

/**
 * The walkers' lines of the latest days in the changelog (`CHANGELOG.md`): each day a `## YYYY-MM-DD`
 * heading, its lines for walkers under `### For walkers`, newest first. A day with only lines for
 * contributors (`### Under the hood`) is passed over.
 */
export function whatsNew(markdown: string, days = 3): News[] {
	const news: News[] = [];
	let day: News | undefined;
	let forWalkers = false;
	for (const line of markdown.split('\n')) {
		const date = line.match(/^## (\d{4}-\d{2}-\d{2})\s*$/);
		if (date) {
			day = { date: date[1], items: [] };
			forWalkers = false;
			continue;
		}
		if (line.startsWith('### ')) {
			forWalkers = line.trim() === '### For walkers';
			continue;
		}
		const item = line.match(/^- (.+)$/);
		if (item && day && forWalkers) {
			if (!day.items.length) news.push(day);
			day.items.push(item[1].trim());
		}
	}
	return news.slice(0, days);
}
