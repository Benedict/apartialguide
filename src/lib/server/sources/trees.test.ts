import { describe, expect, it } from 'vitest';
import { parseCsv, treeRecords } from './trees';

describe('parseCsv', () => {
	it('reads a header and rows, with quoted commas and doubled quotes', () => {
		expect(parseCsv('a,b,c\r\n1,"two, too","say ""hi"""\n4,5,6\n')).toEqual([
			{ a: '1', b: 'two, too', c: 'say "hi"' },
			{ a: '4', b: '5', c: '6' }
		]);
	});
});

describe('parseCsv, keeping', () => {
	it('keeps only the rows asked for', () => {
		expect(parseCsv('a,b\n1,x\n2,y\n3,z', (row) => row.a !== '2')).toEqual([
			{ a: '1', b: 'x' },
			{ a: '3', b: 'z' }
		]);
	});
});

describe('treeRecords', () => {
	const box = '-0.08,51.37,-0.06,51.39';
	const streets = [
		{
			name: 'Long Street',
			line: [
				[51.38, -0.075],
				[51.38, -0.065]
			] as [number, number][]
		},
		{
			name: 'Short Row',
			line: [
				[51.375, -0.075],
				[51.385, -0.075]
			] as [number, number][]
		}
	];
	const tree = (lat: number, lon: number, common_name: string) => ({
		latitude: String(lat),
		longitude: String(lon),
		common_name,
		borough: 'Invented'
	});

	it('counts each street’s trees by their names as found, most first', () => {
		const records = treeRecords(
			[
				tree(51.38005, -0.07, 'London plane'),
				tree(51.37995, -0.069, 'London plane'),
				tree(51.38003, -0.068, 'Lime'),
				tree(51.378, -0.07501, 'Cherry'),
				tree(51.36, -0.07, 'Outside the box'),
				tree(51.389, -0.062, 'Far from any street')
			],
			box,
			streets
		);
		expect(records).toEqual([
			{
				id: 'trees:Long Street',
				street: 'Long Street',
				claims: { count: '3', kinds: 'London plane (2), Lime (1)' }
			},
			{
				id: 'trees:Short Row',
				street: 'Short Row',
				claims: { count: '1', kinds: 'Cherry (1)' }
			}
		]);
	});

	it('takes the species when there is no common name, and skips a tree with neither', () => {
		const records = treeRecords(
			[
				{ lat: '51.38', lon: '-0.07', species: 'Platanus x hispanica' },
				{ lat: '51.38', lon: '-0.071', species: '' }
			],
			box,
			streets
		);
		expect(records[0].claims).toEqual({ count: '1', kinds: 'Platanus x hispanica (1)' });
	});
});
