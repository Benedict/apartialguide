import type { Fact, SourceAdapter } from '../facts';
import { elementRef, type OsmElement, type OsmIndex } from '../osm';

const SURVEY_KEYS = ['survey:date', 'check_date', 'survey_date'];
const isProvenance = (key: string) =>
	key === 'created_by' || key === 'source' || key.startsWith('source:');

export interface OsmAdapterOptions {
	/** Reach of facts about streets, in metres. */
	streetReach?: number;
	/** Reach of facts about everything else, in metres. */
	featureReach?: number;
}

/** Every tag on every tagged node and way becomes one fact, its value kept exactly as found. */
export class OsmAdapter implements SourceAdapter {
	readonly name = 'osm';

	constructor(
		private readonly osm: OsmIndex,
		private readonly options: OsmAdapterOptions = {}
	) {}

	facts(): Fact[] {
		const { streetReach = 15, featureReach = 30 } = this.options;
		const facts: Fact[] = [];
		for (const e of this.osm.data.elements) {
			if (!e.tags || e.type === 'relation') continue;
			const geometry =
				e.type === 'node' ? [[e.lat, e.lon] as [number, number]] : this.osm.wayGeometry(e);
			if (geometry.length === 0) continue;
			const subject = elementRef(e);
			const { observed, observedBy } = observation(e);
			const reach = e.type === 'way' && e.tags.highway ? streetReach : featureReach;
			for (const [key, value] of Object.entries(e.tags)) {
				if (isProvenance(key)) continue;
				facts.push({
					id: `osm:${subject}:${key}`,
					subject,
					claim: { key, value },
					source: 'osm',
					observed,
					observedBy,
					reach,
					geometry
				});
			}
		}
		return facts;
	}
}

function observation(e: OsmElement): Pick<Fact, 'observed' | 'observedBy'> {
	const survey = SURVEY_KEYS.map((k) => e.tags?.[k]).find(Boolean);
	if (survey) return { observed: survey.slice(0, 10), observedBy: 'survey' };
	if (e.timestamp) return { observed: e.timestamp.slice(0, 10), observedBy: 'edit' };
	return {};
}
