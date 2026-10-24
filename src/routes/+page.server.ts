import { error, redirect } from '@sveltejs/kit';
import { narrator } from '#lib/server/narrator.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const loaded = narrator();
	if (!loaded) error(503, 'No snapshot is configured. Set SNAPSHOT_PATH.');
	const { narrator: n, config } = loaded;
	const start = config.start
		? n.nearestStop(config.start)
		: n.graph.all().find((s) => s.kind === 'junction');
	if (!start) error(503, 'The snapshot has no streets in it.');
	redirect(307, `/stop/${start.id}`);
};
