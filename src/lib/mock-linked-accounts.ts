import { Holding } from '@/types/portfolio';

export interface LinkedAccount {
  id: string;
  accountId: string;
  accountName: string;
  accountType: 'Taxable' | 'Tax-Advantaged';
  institution: string;
  lastSyncDate: Date;
  balance: number;
}

export const MOCK_LINKED_ACCOUNTS: LinkedAccount[] = [
  {
    id: '1',
    accountId: 'acct_001',
    accountName: 'Individual Brokerage',
    accountType: 'Taxable',
    institution: 'Fidelity Investments',
    lastSyncDate: new Date(),
    balance: 125430.50,
  },
  {
    id: '2',
    accountId: 'acct_002',
    accountName: 'Traditional IRA',
    accountType: 'Tax-Advantaged',
    institution: 'Vanguard',
    lastSyncDate: new Date(),
    balance: 89200.00,
  },
  {
    id: '3',
    accountId: 'acct_003',
    accountName: '401(k)',
    accountType: 'Tax-Advantaged',
    institution: 'Schwab',
    lastSyncDate: new Date(),
    balance: 156780.25,
  },
];

// Holdings already tagged with their source account
export const getHoldingsByAccount = (holdings: Holding[]): Record<string, Holding[]> => {
  const byAccount: Record<string, Holding[]> = {};
  
  holdings.forEach((holding) => {
    const accountType = holding.accountType;
    if (!byAccount[accountType]) {
      byAccount[accountType] = [];
    }
    byAccount[accountType].push(holding);
  });
  
  return byAccount;
};
