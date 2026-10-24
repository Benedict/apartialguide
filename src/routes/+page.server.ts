import { error } from '@sveltejs/kit';
import { adventureWorld } from '#lib/server/narrator.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const loaded = adventureWorld();
	if (!loaded) error(503, 'No snapshot is configured. Set SNAPSHOT_PATH.');
	return { world: loaded.world, snapshotDate: loaded.config.snapshotDate };
};
