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

/**
 * Every tag on every tagged node, way and area drawn as a multipolygon becomes one fact, its value
 * kept exactly as found. A multipolygon is told at its outer edge, as a closed way is.
 */
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
			if (!e.tags) continue;
			const geometry =
				e.type === 'node'
					? [[e.lat, e.lon] as [number, number]]
					: e.type === 'way'
						? this.osm.wayGeometry(e)
						: outerEdge(this.osm.relationRings(e).outer);
			if (geometry.length === 0) continue;
			const subject = elementRef(e);
			const { observed, observedBy } = observation(e);
			const reach = e.type === 'way' && e.tags.highway ? streetReach : featureReach;
			for (const [key, value] of Object.entries(e.tags)) {
				if (isProvenance(key) || (e.type === 'relation' && key === 'type')) continue;
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

/** A multipolygon's outer edge: the outer ring with most points, or none when no ring closes. */
function outerEdge(rings: [number, number][][]): [number, number][] {
	return rings.reduce<[number, number][]>((a, b) => (b.length > a.length ? b : a), []);
}
