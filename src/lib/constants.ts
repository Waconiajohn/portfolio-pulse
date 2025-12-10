import { AssetClass, RiskTolerance } from '@/types/portfolio';

// Expected returns by asset class (annual %)
export const EXPECTED_RETURNS: Record<AssetClass, number> = {
  'US Stocks': 0.09,
  'Intl Stocks': 0.08,
  'Bonds': 0.035,
  'Commodities': 0.05,
  'Cash': 0.02,
  'Other': 0.06,
};

// Volatility by asset class (annual %)
export const VOLATILITY: Record<AssetClass, number> = {
  'US Stocks': 0.165,
  'Intl Stocks': 0.19,
  'Bonds': 0.04,
  'Commodities': 0.15,
  'Cash': 0.005,
  'Other': 0.12,
};

// Default expense ratios
export const DEFAULT_EXPENSE_RATIOS = {
  etf: 0.0005,
  indexFund: 0.001,
  activeFund: 0.0075,
  bond: 0.0035,
};

// Risk tolerance target volatility
export const TARGET_VOLATILITY: Record<RiskTolerance, number> = {
  'Conservative': 0.08,
  'Moderate': 0.12,
  'Aggressive': 0.18,
};

// Risk-free rate
export const RISK_FREE_RATE = 0.03;

// Inflation rate
export const INFLATION_RATE = 0.025;

// Crisis scenarios (market decline %)
export const CRISIS_SCENARIOS = {
  techBubble2000: { equity: -0.45, bonds: 0.10, name: '2000 Tech Crash' },
  financialCrisis2008: { equity: -0.55, bonds: 0.05, name: '2008 Financial Crisis' },
  covidCrash2020: { equity: -0.34, bonds: 0.02, name: '2020 Covid Shock' },
};

// Benchmark definitions for portfolio comparison
export const BENCHMARKS = {
  sp500: {
    name: 'S&P 500',
    description: '100% US Large Cap',
    allocation: { 'US Stocks': 1.0 },
    expectedReturn: 0.09,
    volatility: 0.165,
    expenseRatio: 0.0003,
  },
  balanced60_40: {
    name: '60/40 Portfolio',
    description: '60% Stocks, 40% Bonds',
    allocation: { 'US Stocks': 0.60, 'Bonds': 0.40 },
    expectedReturn: 0.068,
    volatility: 0.10,
    expenseRatio: 0.0005,
  },
  totalWorld: {
    name: 'Total World',
    description: '60% US, 40% Intl Stocks',
    allocation: { 'US Stocks': 0.60, 'Intl Stocks': 0.40 },
    expectedReturn: 0.085,
    volatility: 0.175,
    expenseRatio: 0.0007,
  },
} as const;

export type BenchmarkKey = keyof typeof BENCHMARKS;

// Sector mapping for common tickers (simplified)
export const SECTOR_MAPPING: Record<string, string> = {
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'AMZN': 'Consumer Discretionary',
  'META': 'Technology',
  'NVDA': 'Technology',
  'JPM': 'Financials',
  'V': 'Financials',
  'JNJ': 'Healthcare',
  'UNH': 'Healthcare',
  'PG': 'Consumer Staples',
  'XOM': 'Energy',
  'CVX': 'Energy',
  'SPY': 'Diversified',
  'QQQ': 'Technology',
  'VTI': 'Diversified',
  'BND': 'Fixed Income',
  'AGG': 'Fixed Income',
  'GLD': 'Commodities',
  'VNQ': 'Real Estate',
};

// Category labels
export const DIAGNOSTIC_CATEGORIES = {
  riskManagement: { name: 'Risk Management', icon: 'Shield' },
  protection: { name: 'Protection & Vulnerability', icon: 'ShieldAlert' },
  returnEfficiency: { name: 'Return Efficiency', icon: 'TrendingUp' },
  costAnalysis: { name: 'Cost & Fee Analysis', icon: 'DollarSign' },
  taxEfficiency: { name: 'Tax Efficiency', icon: 'Receipt' },
  diversification: { name: 'Diversification Quality', icon: 'PieChart' },
  riskAdjusted: { name: 'Risk-Adjusted Performance', icon: 'BarChart3' },
  crisisResilience: { name: 'Crisis Resilience', icon: 'Umbrella' },
  optimization: { name: 'Portfolio Optimization', icon: 'Settings2' },
  planningGaps: { name: 'Planning Gaps', icon: 'ClipboardCheck' },
  lifetimeIncomeSecurity: { name: 'Lifetime Income Security', icon: 'Wallet' },
} as const;
