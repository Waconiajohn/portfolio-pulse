import { Holding } from '@/types/portfolio';

export const SAMPLE_HOLDINGS: Holding[] = [
  // US Large Cap Stocks
  { id: '1', ticker: 'AAPL', name: 'Apple Inc.', shares: 50, currentPrice: 178.50, costBasis: 145.00, accountType: 'Taxable', assetClass: 'US Stocks', expenseRatio: 0 },
  { id: '2', ticker: 'MSFT', name: 'Microsoft Corp.', shares: 30, currentPrice: 378.90, costBasis: 290.00, accountType: 'Tax-Advantaged', assetClass: 'US Stocks', expenseRatio: 0 },
  { id: '3', ticker: 'GOOGL', name: 'Alphabet Inc.', shares: 25, currentPrice: 141.80, costBasis: 125.00, accountType: 'Taxable', assetClass: 'US Stocks', expenseRatio: 0 },
  { id: '4', ticker: 'NVDA', name: 'NVIDIA Corp.', shares: 20, currentPrice: 495.00, costBasis: 220.00, accountType: 'Tax-Advantaged', assetClass: 'US Stocks', expenseRatio: 0 },
  
  // ETFs - US Equity
  { id: '5', ticker: 'SPY', name: 'SPDR S&P 500 ETF', shares: 100, currentPrice: 478.50, costBasis: 420.00, accountType: 'Tax-Advantaged', assetClass: 'US Stocks', expenseRatio: 0.0009 },
  { id: '6', ticker: 'QQQ', name: 'Invesco QQQ Trust', shares: 40, currentPrice: 408.20, costBasis: 350.00, accountType: 'Taxable', assetClass: 'US Stocks', expenseRatio: 0.002 },
  { id: '7', ticker: 'VTI', name: 'Vanguard Total Stock', shares: 80, currentPrice: 252.30, costBasis: 210.00, accountType: 'Tax-Advantaged', assetClass: 'US Stocks', expenseRatio: 0.0003 },
  
  // International
  { id: '8', ticker: 'VXUS', name: 'Vanguard Total Intl', shares: 150, currentPrice: 58.40, costBasis: 62.00, accountType: 'Tax-Advantaged', assetClass: 'Intl Stocks', expenseRatio: 0.0007 },
  { id: '9', ticker: 'EFA', name: 'iShares MSCI EAFE', shares: 60, currentPrice: 76.80, costBasis: 80.00, accountType: 'Taxable', assetClass: 'Intl Stocks', expenseRatio: 0.0032 },
  
  // Bonds
  { id: '10', ticker: 'BND', name: 'Vanguard Total Bond', shares: 200, currentPrice: 72.50, costBasis: 78.00, accountType: 'Tax-Advantaged', assetClass: 'Bonds', expenseRatio: 0.0003 },
  { id: '11', ticker: 'AGG', name: 'iShares Core US Agg', shares: 100, currentPrice: 98.20, costBasis: 105.00, accountType: 'Taxable', assetClass: 'Bonds', expenseRatio: 0.0003 },
  { id: '12', ticker: 'TLT', name: 'iShares 20+ Year Treasury', shares: 50, currentPrice: 92.40, costBasis: 110.00, accountType: 'Tax-Advantaged', assetClass: 'Bonds', expenseRatio: 0.0015 },
  
  // Commodities & Alternatives
  { id: '13', ticker: 'GLD', name: 'SPDR Gold Shares', shares: 30, currentPrice: 186.50, costBasis: 170.00, accountType: 'Taxable', assetClass: 'Commodities', expenseRatio: 0.004 },
  { id: '14', ticker: 'VNQ', name: 'Vanguard Real Estate', shares: 40, currentPrice: 84.20, costBasis: 95.00, accountType: 'Tax-Advantaged', assetClass: 'Other', expenseRatio: 0.0012 },
  
  // Individual stocks with losses (tax loss harvesting candidates)
  { id: '15', ticker: 'DIS', name: 'Walt Disney Co.', shares: 25, currentPrice: 91.50, costBasis: 135.00, accountType: 'Taxable', assetClass: 'US Stocks', expenseRatio: 0 },
];
