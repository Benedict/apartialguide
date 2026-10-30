import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';

/** JSON from disk, gunzipped first when the file is `.gz`: a whole borough's map is kept gzipped. */
export function readJson<T = unknown>(path: string): T {
	const bytes = readFileSync(path);
	return JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8')) as T;
}

/**
 * JSON to disk, gzipped when the path ends `.gz`. An object's `elements` are written one by one,
 * so a map larger than the longest string JavaScript allows can still be written.
 */
export function writeJson(path: string, value: Record<string, unknown>): void {
	const { elements, ...rest } = value;
	const head = JSON.stringify(rest);
	const pieces: Buffer[] = [];
	if (Array.isArray(elements)) {
		pieces.push(Buffer.from(`${head.slice(0, -1)}${head.length > 2 ? ',' : ''}"elements":[`));
		elements.forEach((e, i) => pieces.push(Buffer.from(`${i ? ',' : ''}${JSON.stringify(e)}`)));
		pieces.push(Buffer.from(']}'));
	} else pieces.push(Buffer.from(head));
	const bytes = Buffer.concat(pieces);
	writeFileSync(path, path.endsWith('.gz') ? gzipSync(bytes) : bytes);
}
