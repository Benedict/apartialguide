import { error } from '@sveltejs/kit';
import { narrator } from '#lib/server/narrator.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const loaded = narrator();
	if (!loaded) error(503, 'No snapshot is configured. Set SNAPSHOT_PATH.');
	const visit = loaded.narrator.visit(params.id);
	if (!visit) error(404, 'There is no such stop.');
	return {
		paragraphs: visit.text.split('\n\n'),
		exits: visit.exits.map((e) => ({ label: e.label, street: e.street, to: e.to })),
		snapshotDate: loaded.config.snapshotDate
	};
};
