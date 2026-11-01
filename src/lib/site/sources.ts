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

export type LiveKey =
	| 'weather'
	| 'departures'
	| 'roads'
	| 'maps'
	| 'air'
	| 'cameras'
	| 'satellites'
	| 'flights'
	| 'news';

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
		name: 'TfL road disruptions',
		href: 'https://api.tfl.gov.uk/',
		gives: 'works and closures on the roads near the map’s place, as you arrive',
		terms: 'Powered by TfL Open Data',
		live: 'roads'
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
		name: 'TfL JamCams',
		href: 'https://api.tfl.gov.uk/',
		gives: 'what the traffic camera nearest the map’s place last saw',
		terms: 'Powered by TfL Open Data',
		live: 'cameras'
	},
	{
		name: 'CelesTrak',
		href: 'https://celestrak.org/',
		gives: 'the orbits of the bright satellites, from which those overhead are worked out',
		terms: 'Orbital elements from CelesTrak, by Dr T.S. Kelso',
		live: 'satellites'
	},
	{
		name: 'adsb.lol',
		href: 'https://adsb.lol/',
		gives: 'the aircraft overhead, as they broadcast themselves',
		terms: 'Open Database License (ODbL)',
		live: 'flights'
	},
	{
		name: 'GDELT Project',
		href: 'https://www.gdeltproject.org/',
		gives:
			'the day’s headlines that name the map’s place, when you ask for the news, through this site’s own function, without those that tell of death or crime',
		terms: 'The GDELT Project, free for any use with citation',
		live: 'news'
	},
	{
		name: 'Astronomy Engine',
		href: 'https://github.com/cosinekitty/astronomy',
		gives: 'where the planets stand, worked out in your browser',
		terms: 'MIT License, by Don Cross'
	},
	{
		name: 'satellite.js',
		href: 'https://github.com/shashwatak/satellite-js',
		gives: 'the working out of where each satellite is',
		terms: 'MIT License'
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
		href: 'https://get-energy-performance-data.communities.gov.uk/',
		gives: 'how houses are rated for energy, and when, told when you look closer',
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
		name: 'Digital Britannia',
		href: 'https://roadsofromanbritain.org/digital-britannia/',
		gives:
			'the Roman roads, settlements, forts and camps near the map, told when you look beyond it',
		terms:
			'Roman Roads Research Association, Digital Britannia v1, © Mike Haken 2026, CC BY-NC 4.0. Its settlements are in part from the Rural Settlement of Roman Britain project (2015), archived with the Archaeology Data Service'
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
	roads: 'Ask after works and closures on the roads here',
	maps: 'Show a map beside gps, on a wide screen',
	air: 'Ask after the air today',
	cameras: 'Show what the nearest traffic camera saw, when you use the camera',
	satellites: 'Work out the satellites overhead, when you look up',
	flights: 'Ask after the aircraft overhead, when you look up',
	news: 'Ask after the day’s news of the place, when you ask for it'
};

/** The settings for the sources asked from the reader's browser. */
export const LIVE: { key: LiveKey; label: string; source: string }[] = SOURCES.filter(
	(s): s is Source & { live: LiveKey } => !!s.live
).map((s) => ({
	key: s.live,
	label: LABELS[s.live],
	source: s.name
}));
