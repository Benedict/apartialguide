/** A keeper's name as found, without the file or layer a fetch noted after it. */
export const keeper = (source: string) =>
	source === 'wikidata' ? 'Wikidata' : source.split(/,|\(/)[0].trim();

/** What each keeper of another account does: Guide alludes to them this way and never names them. */
const DOINGS: Record<string, string> = {
	Wikidata: 'those who keep an encyclopaedia of everything',
	'Food Standards Agency': 'those who inspect kitchens',
	'Historic England': 'those who list old buildings',
	'London Planning Datahub': 'those who hear what is planned',
	'Open Plaques': 'those who record plaques',
	'HM Land Registry': 'those who write down what houses sell for',
	'police.uk': 'those who count crimes by the month',
	'Greater London Authority': 'those who count trees',
	'Office for National Statistics': 'those who draw the wards and number the streets',
	OpenBenches: 'those who read the benches',
	'NBN Atlas': 'those who note what lives here',
	'Companies House': 'those who register companies',
	'Environment Agency': 'those who map where the water goes',
	'Energy Performance of Buildings Register': 'those who rate houses for the heat they lose',
	Geograph: 'those who photograph every square of the country',
	'Roman Roads Research Association': 'those who trace the Roman roads'
};

/** A keeper by what they do, if Guide knows; never their name. */
export const allusion = (name: string): string | undefined => DOINGS[keeper(name)];

/** Keepers by what they do, in a list: those Guide cannot place are owned to as others. */
export function alludedTo(names: readonly string[]): string {
	const known = names.map(allusion).filter((a): a is string => !!a);
	const others = known.length < names.length;
	if (!known.length) return 'others';
	const list = known.length < 2 ? known[0] : `${known.slice(0, -1).join(', ')} and ${known.at(-1)}`;
	return others ? `${known.join(', ')}, and others` : list;
}
