/** A source of what Guide says, as the About page credits it. */
export interface Source {
	name: string;
	href: string;
	/** What Guide takes from it. */
	gives: string;
	/** Its licence, and any attribution it asks for. */
	terms: string;
	/** Asked from the reader's browser as they read, under this setting. */
	live?: LiveKey;
}

export type LiveKey = 'weather' | 'departures';

const OGL = 'Open Government Licence v3.0';

export const SOURCES: Source[] = [
	{
		name: 'OpenStreetMap',
		href: 'https://www.openstreetmap.org/copyright',
		gives:
			'the map Guide carries: streets, buildings, shops, names and addresses, as one dated copy taken by hand',
		terms: '© OpenStreetMap contributors, ODbL'
	},
	{
		name: 'Open-Meteo',
		href: 'https://open-meteo.com/',
		gives: 'today’s weather, asked for the map’s own place, never yours',
		terms: 'CC BY 4.0',
		live: 'weather'
	},
	{
		name: 'Transport for London',
		href: 'https://tfl.gov.uk/info-for/open-data-users/',
		gives: 'what is due next at the bus and tram stops on the map',
		terms: 'Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016',
		live: 'departures'
	},
	{
		name: 'SunCalc',
		href: 'https://github.com/mourner/suncalc',
		gives: 'where the sun and moon stand, worked out in your browser; nothing is asked of anyone',
		terms: 'BSD-2-Clause, Vladimir Agafonkin'
	},
	{
		name: 'Wikidata',
		href: 'https://www.wikidata.org/',
		gives: 'another account of what the map links to, and who streets are named for',
		terms: 'CC0'
	},
	{
		name: 'Food Standards Agency',
		href: 'https://ratings.food.gov.uk/',
		gives: 'food hygiene ratings',
		terms: OGL
	},
	{
		name: 'planning.data.gov.uk',
		href: 'https://www.planning.data.gov.uk/',
		gives: 'listed buildings',
		terms: OGL
	},
	{
		name: 'London Planning Datahub',
		href: 'https://planningdata.london.gov.uk/',
		gives: 'planning applications',
		terms: OGL
	},
	{
		name: 'HM Land Registry Price Paid',
		href: 'https://www.gov.uk/government/collections/price-paid-data',
		gives: 'what houses last sold for',
		terms: `Contains HM Land Registry data © Crown copyright and database right 2026. ${OGL}`
	},
	{
		name: 'police.uk',
		href: 'https://data.police.uk/',
		gives: 'street-level crime, by month',
		terms: OGL
	},
	{
		name: 'Open Plaques',
		href: 'https://openplaques.org/',
		gives: 'plaques and what they say',
		terms: 'Open Plaques contributors'
	},
	{
		name: 'Office for National Statistics',
		href: 'https://geoportal.statistics.gov.uk/',
		gives: 'ward boundaries',
		terms: `Source: Office for National Statistics. Contains OS data © Crown copyright and database right 2026. ${OGL}`
	},
	{
		name: 'London Datastore',
		href: 'https://data.london.gov.uk/dataset/london-public-realm-trees-2r45m',
		gives: 'the trees listed along streets',
		terms: `Greater London Authority. ${OGL}`
	}
];

/** The settings for the sources asked from the reader's browser. */
export const LIVE: { key: LiveKey; label: string; source: string }[] = SOURCES.filter(
	(s): s is Source & { live: LiveKey } => !!s.live
).map((s) => ({
	key: s.live,
	label:
		s.live === 'weather' ? 'Ask after today’s weather' : 'Ask what is due at bus and tram stops',
	source: s.name
}));
