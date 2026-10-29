/**
 * What prose says that the facts it was given do not: numbers, quoted names, and capitalised words
 * that do not begin a sentence. Each must appear in the facts as words (the prompt's user text).
 * A guard, not a proof: it catches the invented proper noun, date or figure, not an invented common
 * noun, which the prompt forbids and a reader may still find.
 */
export function unfounded(facts: string, paragraphs: readonly string[]): string[] {
	const given = facts.normalize('NFC');
	const joined = (t: string) => t.replace(/(\d),(\d{3})\b/g, '$1$2');
	const digits = new Set(joined(given).match(/\d+/g) ?? []);
	const found: string[] = [];
	const note = (s: string) => {
		if (!found.includes(s)) found.push(s);
	};
	for (const paragraph of paragraphs) {
		const text = paragraph.normalize('NFC');
		// A quotation may give all or part of what the facts say, as found.
		for (const quoted of text.match(/“[^”]+”/g) ?? [])
			if (!given.includes(quoted.slice(1, -1))) note(quoted);
		// Numbers, read past thousands commas and range dashes: 412,000 is 412000; 12–14 is 12 and 14.
		for (const n of joined(text).match(/\d+/g) ?? []) if (!digits.has(n)) note(n);
		// A capitalised word inside a sentence, outside a quotation, is a name: the facts must hold it.
		// A quotation that ends with its own full stop ends the sentence too.
		const unquoted = text.replace(/“([^”]+)”/g, (_, q: string) => (/[.!?]$/.test(q) ? '. ' : ' '));
		for (const sentence of unquoted.split(/(?<=[.!?:;][”’"')]?)\s+|\n/)) {
			const words = sentence.trim().split(/\s+/).slice(1);
			for (const raw of words) {
				const word = raw.replace(/^[^\p{L}]+|[^\p{L}’'-]+$/gu, '').replace(/[’']s$/, '');
				if (!/^\p{Lu}/u.test(word) || word === 'I') continue;
				if (
					!new RegExp(
						`(?<!\\p{L})${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\p{L})`,
						'u'
					).test(given)
				)
					note(word);
			}
		}
	}
	return found;
}
