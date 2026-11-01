import { describe, expect, it } from 'vitest';
import { wallcapAccounts } from './wallcap';

// Invented rows, shaped as WallCAP's tables are.
const milecastles = [
	{ MC_UID: '7', MC_Number: '1', MC_Modern_Name: 'Inventhaugh' },
	{ MC_UID: '8', MC_Number: '2', MC_Modern_Name: 'Farhaugh' }
];
const core = [
	{
		CD_UID: '7',
		CD_Condition_Description:
			'Stones were taken in the 18th century (Simpson, 1975), and it is probable nothing remains.',
		CD_Summary: 'Surveyed by an antiquary.\\n\\nA kiln was built over it in 1885.'.replace(
			/\\n/g,
			'\n'
		)
	},
	{ CD_UID: '99', CD_Condition_Description: 'Another place altogether.', CD_Summary: '' }
];

describe('wallcapAccounts (each milecastle’s whole account, from WallCAP’s own tables)', () => {
	const accounts = wallcapAccounts(milecastles, core);

	it('joins each milecastle to its account by its record, and keeps the words whole', () => {
		expect(accounts[1]).toEqual({
			account:
				'Stones were taken in the 18th century (Simpson, 1975), and it is probable nothing remains.',
			history: ['Surveyed by an antiquary.', 'A kiln was built over it in 1885.']
		});
	});

	it('gives nothing for a milecastle whose account is not kept', () => {
		expect(accounts[2]).toBeUndefined();
	});
});
