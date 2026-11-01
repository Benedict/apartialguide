import { SOURCES, type Source } from '../site/sources';

/**
 * What the Roman walk's About credits: Digital Britannia and the projects it draws on, and the
 * borough's sources that work anywhere (today's weather and air, the sky worked out, the map tiles),
 * never those that know only London or the map of Croydon.
 */
const ANYWHERE = new Set([
	'Open-Meteo',
	'Open-Meteo Air Quality',
	'OpenFreeMap',
	'CelesTrak',
	'adsb.lol',
	'Astronomy Engine',
	'satellite.js',
	'SunCalc'
]);

export const ROMAN_SOURCES: Source[] = [
	{
		name: 'Digital Britannia',
		href: 'https://roadsofromanbritain.org/digital-britannia/',
		gives: 'the Roman roads, settlements, forts, camps and milestones, and Hadrian’s Wall',
		terms:
			'Roman Roads Research Association, Digital Britannia v1, © Mike Haken 2026, CC BY-NC 4.0. A little over half its settlements are from the Rural Settlement of Roman Britain project (2015), archived with the Archaeology Data Service'
	},
	{
		name: 'WallCAP',
		href: 'https://doi.org/10.5284/1100071',
		gives: 'Hadrian’s Wall, the Vallum and the milecastles, with what is known of each',
		terms:
			'Hadrian’s Wall and the Vallum based on the files prepared for WallCAP by Kathryn Murphy and Nicky Garland, with minor tweaks by Mike Haken; the milecastles derived from WallCAP data created by Kathryn Murphy; CC BY 4.0. All WallCAP GIS files are with the Archaeology Data Service'
	},
	...SOURCES.filter((s) => ANYWHERE.has(s.name))
];
