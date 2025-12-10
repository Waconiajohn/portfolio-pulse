import { AssetClass, RiskTolerance } from '@/types/portfolio';

export interface AssetAssumptions {
  expectedReturn: number;
  volatility: number;
  defaultExpenseRatio: number;
}

export interface PortfolioAssumptions {
  assetClasses: Record<AssetClass, AssetAssumptions>;
  riskFreeRate: number;
  inflationRate: number;
  targetVolatility: Record<RiskTolerance, number>;
}

export const DEFAULT_ASSUMPTIONS: PortfolioAssumptions = {
  assetClasses: {
    'US Stocks': { expectedReturn: 0.09, volatility: 0.165, defaultExpenseRatio: 0.0005 },
    'Intl Stocks': { expectedReturn: 0.08, volatility: 0.19, defaultExpenseRatio: 0.001 },
    'Bonds': { expectedReturn: 0.035, volatility: 0.04, defaultExpenseRatio: 0.0003 },
    'Commodities': { expectedReturn: 0.05, volatility: 0.15, defaultExpenseRatio: 0.004 },
    'Cash': { expectedReturn: 0.02, volatility: 0.005, defaultExpenseRatio: 0 },
    'Other': { expectedReturn: 0.06, volatility: 0.12, defaultExpenseRatio: 0.001 },
  },
  riskFreeRate: 0.03,
  inflationRate: 0.025,
  targetVolatility: {
    'Conservative': 0.08,
    'Moderate': 0.12,
    'Aggressive': 0.18,
  },
};

// Storage key for persisting assumptions
export const ASSUMPTIONS_STORAGE_KEY = 'portfolio-diagnostic-assumptions';

export function loadAssumptions(): PortfolioAssumptions {
  try {
    const stored = localStorage.getItem(ASSUMPTIONS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load assumptions:', e);
  }
  return DEFAULT_ASSUMPTIONS;
}

export function saveAssumptions(assumptions: PortfolioAssumptions): void {
  try {
    localStorage.setItem(ASSUMPTIONS_STORAGE_KEY, JSON.stringify(assumptions));
  } catch (e) {
    console.error('Failed to save assumptions:', e);
  }
}
