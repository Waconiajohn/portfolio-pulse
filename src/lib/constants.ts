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

// Ticker-specific expected returns and volatility estimates
// Based on historical 10-year data and analyst estimates
export const TICKER_ESTIMATES: Record<string, { expectedReturn: number; volatility: number }> = {
  // Large Cap Tech
  'AAPL': { expectedReturn: 0.12, volatility: 0.28 },
  'MSFT': { expectedReturn: 0.11, volatility: 0.25 },
  'GOOGL': { expectedReturn: 0.10, volatility: 0.27 },
  'GOOG': { expectedReturn: 0.10, volatility: 0.27 },
  'AMZN': { expectedReturn: 0.13, volatility: 0.32 },
  'META': { expectedReturn: 0.14, volatility: 0.38 },
  'NVDA': { expectedReturn: 0.18, volatility: 0.50 },
  'TSLA': { expectedReturn: 0.15, volatility: 0.55 },
  // Financials
  'JPM': { expectedReturn: 0.09, volatility: 0.24 },
  'BAC': { expectedReturn: 0.08, volatility: 0.28 },
  'V': { expectedReturn: 0.11, volatility: 0.22 },
  'MA': { expectedReturn: 0.11, volatility: 0.23 },
  'GS': { expectedReturn: 0.09, volatility: 0.30 },
  // Healthcare
  'JNJ': { expectedReturn: 0.07, volatility: 0.16 },
  'UNH': { expectedReturn: 0.10, volatility: 0.22 },
  'PFE': { expectedReturn: 0.06, volatility: 0.22 },
  'ABBV': { expectedReturn: 0.08, volatility: 0.24 },
  // Consumer
  'PG': { expectedReturn: 0.07, volatility: 0.15 },
  'KO': { expectedReturn: 0.06, volatility: 0.14 },
  'PEP': { expectedReturn: 0.07, volatility: 0.14 },
  'WMT': { expectedReturn: 0.08, volatility: 0.18 },
  'COST': { expectedReturn: 0.10, volatility: 0.20 },
  'HD': { expectedReturn: 0.10, volatility: 0.22 },
  // Energy
  'XOM': { expectedReturn: 0.08, volatility: 0.25 },
  'CVX': { expectedReturn: 0.08, volatility: 0.24 },
  // ETFs & Funds
  'SPY': { expectedReturn: 0.09, volatility: 0.165 },
  'QQQ': { expectedReturn: 0.11, volatility: 0.22 },
  'VTI': { expectedReturn: 0.09, volatility: 0.165 },
  'VOO': { expectedReturn: 0.09, volatility: 0.165 },
  'IWM': { expectedReturn: 0.08, volatility: 0.20 },
  'VEA': { expectedReturn: 0.07, volatility: 0.17 },
  'VWO': { expectedReturn: 0.08, volatility: 0.22 },
  'EFA': { expectedReturn: 0.07, volatility: 0.17 },
  // Bonds
  'BND': { expectedReturn: 0.035, volatility: 0.04 },
  'AGG': { expectedReturn: 0.035, volatility: 0.04 },
  'TLT': { expectedReturn: 0.04, volatility: 0.12 },
  'LQD': { expectedReturn: 0.045, volatility: 0.08 },
  'HYG': { expectedReturn: 0.055, volatility: 0.10 },
  // Commodities & Real Estate
  'GLD': { expectedReturn: 0.05, volatility: 0.15 },
  'SLV': { expectedReturn: 0.04, volatility: 0.25 },
  'VNQ': { expectedReturn: 0.07, volatility: 0.20 },
  // Other common stocks
  'DIS': { expectedReturn: 0.08, volatility: 0.28 },
  'NFLX': { expectedReturn: 0.12, volatility: 0.40 },
  'CRM': { expectedReturn: 0.11, volatility: 0.32 },
  'INTC': { expectedReturn: 0.06, volatility: 0.30 },
  'AMD': { expectedReturn: 0.14, volatility: 0.45 },
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

// Consolidated Category labels (8 categories instead of 11)
export const DIAGNOSTIC_CATEGORIES = {
  riskDiversification: { name: 'Risk & Diversification', icon: 'Shield' },
  downsideResilience: { name: 'Downside Risk & Resilience', icon: 'ShieldAlert' },
  performanceOptimization: { name: 'Performance & Optimization', icon: 'TrendingUp' },
  costAnalysis: { name: 'Cost & Fee Analysis', icon: 'DollarSign' },
  taxEfficiency: { name: 'Tax Efficiency', icon: 'Receipt' },
  riskAdjusted: { name: 'Risk-Adjusted Performance', icon: 'BarChart3' },
  planningGaps: { name: 'Planning Gaps', icon: 'ClipboardCheck' },
  lifetimeIncomeSecurity: { name: 'Lifetime Income Security', icon: 'Wallet' },
} as const;
