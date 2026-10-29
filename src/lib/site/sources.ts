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

export type LiveKey = 'weather' | 'departures' | 'maps' | 'air';

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
		name: 'OpenFreeMap',
		href: 'https://openfreemap.org/',
		gives:
			'the map shown with gps on a wide screen, drawn with MapLibre GL JS, around where the map puts the stop, never where you are',
		terms: '© OpenMapTiles, © OpenStreetMap contributors. MapLibre GL JS, BSD-3-Clause',
		live: 'maps'
	},
	{
		name: 'Open-Meteo Air Quality',
		href: 'https://open-meteo.com/en/docs/air-quality-api',
		gives: 'the air today, modelled for the map’s own place, never yours',
		terms: 'CC BY 4.0; data from the Copernicus Atmosphere Monitoring Service',
		live: 'air'
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
		gives: 'ward boundaries, and postcodes that have ended',
		terms: `Source: Office for National Statistics. Contains OS data © Crown copyright and database right 2026. ${OGL}`
	},
	{
		name: 'OpenBenches',
		href: 'https://openbenches.org/',
		gives: 'benches and what is written on them',
		terms: 'OpenBenches contributors, CC BY-SA 4.0'
	},
	{
		name: 'NBN Atlas',
		href: 'https://nbnatlas.org/',
		gives: 'what has been seen living here, and when',
		terms: 'NBN Atlas and its data partners; only records under CC0, CC BY or the OGL'
	},
	{
		name: 'Companies House',
		href: 'https://www.gov.uk/government/organisations/companies-house',
		gives: 'the companies registered at addresses',
		terms: `Contains public sector information licensed under the ${OGL}`
	},
	{
		name: 'Energy Performance of Buildings Register',
		href: 'https://epc.opendatacommunities.org/',
		gives: 'when houses were built, and how they are rated for energy',
		terms: `Contains public sector information licensed under the ${OGL}; Royal Mail and Ordnance Survey data © Crown copyright and database right`
	},
	{
		name: 'Geograph',
		href: 'https://www.geograph.org.uk/',
		gives: 'the titles of photographs taken here, and when',
		terms: 'Photograph titles © their photographers, licensed under CC BY-SA 2.0'
	},
	{
		name: 'Environment Agency',
		href: 'https://environment.data.gov.uk/',
		gives: 'flood zones, and the floods it has recorded',
		terms: `© Environment Agency copyright and/or database right. ${OGL}`
	},
	{
		name: 'London Datastore',
		href: 'https://data.london.gov.uk/dataset/london-public-realm-trees-2r45m',
		gives: 'the trees listed along streets',
		terms: `Greater London Authority. ${OGL}`
	}
];

const LABELS: Record<LiveKey, string> = {
	weather: 'Ask after today’s weather',
	departures: 'Ask what is due at bus and tram stops',
	maps: 'Show a map beside gps, on a wide screen',
	air: 'Ask after the air today'
};

/** The settings for the sources asked from the reader's browser. */
export const LIVE: { key: LiveKey; label: string; source: string }[] = SOURCES.filter(
	(s): s is Source & { live: LiveKey } => !!s.live
).map((s) => ({
	key: s.live,
	label: LABELS[s.live],
	source: s.name
}));
