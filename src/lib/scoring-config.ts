import { RiskTolerance } from '@/types/portfolio';

// ============================================================================
// ADVICE MODELS
// ============================================================================
export type AdviceModel = 'self-directed' | 'advisor-passive' | 'advisor-tactical';

export const ADVICE_MODEL_LABELS: Record<AdviceModel, string> = {
  'self-directed': 'Self-Directed / No Advisor',
  'advisor-passive': 'Advisor – Passive Planning',
  'advisor-tactical': 'Advisor – Tactical / Active',
};

// ============================================================================
// FEE THRESHOLDS BY ADVICE MODEL
// ============================================================================
export interface FeeThresholds {
  greenMax: number;   // Below this = GREEN
  yellowMax: number;  // Below this = YELLOW, above = RED
}

// ============================================================================
// SCORING CONFIGURATION
// ============================================================================
export interface ScoringConfig {
  // Status thresholds
  statusThresholds: {
    greenMin: number;    // Score >= this = GREEN
    yellowMin: number;   // Score >= this = YELLOW
    // Below yellowMin = RED
  };

  // Risk Management
  riskManagement: {
    maxSinglePositionPct: number;   // default 10%
    maxSectorPct: number;           // default 30%
    maxCountryPct: number;          // default 50%
    riskGapSevereThreshold: number; // default 15%
    riskGapWarningThreshold: number;// default 5%
  };

  // Sharpe Ratio / Return Efficiency
  sharpe: {
    portfolioTarget: number;        // default 0.5
    holdingGoodThreshold: number;   // default same as target
    holdingNeutralOffset: number;   // default 0.15 below good
  };

  // Fee thresholds by advice model
  fees: Record<AdviceModel, FeeThresholds>;

  // Diversification
  diversification: {
    smallPortfolioThreshold: number;  // $250k
    smallPortfolioMinHoldings: number; // 15
    smallPortfolioMaxHoldings: number; // 40
    largePortfolioMinHoldings: number; // 25
    largePortfolioMaxHoldings: number; // 60
    top10ConcentrationMax: number;     // 50%
    top3ConcentrationMax: number;      // 40%
  };

  // Goal Probability (Risk-Adjusted)
  goalProbability: {
    greenMin: number;   // >= 75%
    yellowMin: number;  // >= 50%
    // Below 50% = RED
  };

  // Crisis Resilience
  crisisResilience: {
    betterThanSpThreshold: number;  // Portfolio loss < S&P by this % = better
    similarToSpRange: number;       // Within this % of S&P = similar
  };

  // Planning Gaps
  planningGaps: {
    greenMinComplete: number;  // e.g., 6 of 7 = GREEN
    yellowMinComplete: number; // e.g., 4 of 7 = YELLOW
    criticalItems: string[];   // Items that trigger extra penalty if missing
  };

  // Protection
  protection: {
    highRiskThreshold: number; // Risk score above this = high risk area
    maxHighRiskAreas: number;  // Max high risk areas before RED
  };
}

// ============================================================================
// DEFAULT SCORING CONFIGURATION
// ============================================================================
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  statusThresholds: {
    greenMin: 70,
    yellowMin: 40,
  },

  riskManagement: {
    maxSinglePositionPct: 0.10,
    maxSectorPct: 0.30,
    maxCountryPct: 0.50,
    riskGapSevereThreshold: 0.15,
    riskGapWarningThreshold: 0.05,
  },

  sharpe: {
    portfolioTarget: 0.50,
    holdingGoodThreshold: 0.50,
    holdingNeutralOffset: 0.15,
  },

  fees: {
    'self-directed': { greenMax: 0.0050, yellowMax: 0.0100 },
    'advisor-passive': { greenMax: 0.0100, yellowMax: 0.0150 },
    'advisor-tactical': { greenMax: 0.0150, yellowMax: 0.0200 },
  },

  diversification: {
    smallPortfolioThreshold: 250000,
    smallPortfolioMinHoldings: 15,
    smallPortfolioMaxHoldings: 40,
    largePortfolioMinHoldings: 25,
    largePortfolioMaxHoldings: 60,
    top10ConcentrationMax: 0.50,
    top3ConcentrationMax: 0.40,
  },

  goalProbability: {
    greenMin: 75,
    yellowMin: 50,
  },

  crisisResilience: {
    betterThanSpThreshold: 0.05,
    similarToSpRange: 0.10,
  },

  planningGaps: {
    greenMinComplete: 6,
    yellowMinComplete: 4,
    criticalItems: ['willTrust', 'poaDirectives', 'emergencyFund'],
  },

  protection: {
    highRiskThreshold: 7,
    maxHighRiskAreas: 2,
  },
};

// ============================================================================
// EDUCATION CONTENT FOR EACH DIAGNOSTIC CATEGORY
// ============================================================================
export interface EducationContent {
  title: string;
  whatItMeasures: string;
  goodVsBad: string;
  interpretation: string;
}

export const EDUCATION_CONTENT: Record<string, EducationContent> = {
  riskManagement: {
    title: 'Risk Management',
    whatItMeasures: 'Measures how well your portfolio aligns with your stated risk tolerance and whether any single position or sector creates excessive concentration risk.',
    goodVsBad: `GOOD: No single position exceeds ${(DEFAULT_SCORING_CONFIG.riskManagement.maxSinglePositionPct * 100).toFixed(0)}% of portfolio, no sector exceeds ${(DEFAULT_SCORING_CONFIG.riskManagement.maxSectorPct * 100).toFixed(0)}%, and volatility matches your risk profile. BAD: Large positions create "key person" risk where one stock's decline can significantly impact your wealth.`,
    interpretation: 'Conservative investors should have lower volatility and stricter concentration limits. Aggressive investors can tolerate more concentrated bets, but the same position limits still apply to manage tail risk.',
  },

  protection: {
    title: 'Protection & Vulnerability',
    whatItMeasures: 'Analyzes your portfolio\'s exposure to five key risk factors: inflation risk, interest rate risk, market crash risk, liquidity risk, and credit risk.',
    goodVsBad: 'GOOD: Score 70+ means adequate protection against most scenarios. BAD: Score below 70 indicates gaps - your portfolio may be vulnerable to inflation, rising rates, or market crashes depending on which areas score poorly.',
    interpretation: 'Younger, more aggressive investors can accept higher market crash exposure in exchange for growth. Near-retirees should prioritize protection over growth potential.',
  },

  returnEfficiency: {
    title: 'Return Efficiency (Sharpe Ratio)',
    whatItMeasures: `Sharpe ratio measures return per unit of risk. A higher Sharpe means you're being compensated better for the risk you're taking. Target: ${DEFAULT_SCORING_CONFIG.sharpe.portfolioTarget.toFixed(2)}.`,
    goodVsBad: `GOOD: Sharpe ≥ ${DEFAULT_SCORING_CONFIG.sharpe.portfolioTarget.toFixed(2)} means competitive risk-adjusted returns. BAD: Sharpe below target means either returns are too low or volatility is too high relative to those returns.`,
    interpretation: 'Compare your Sharpe to the S&P 500 historical average (~0.5). Holdings labeled "POOR" are dragging down overall efficiency and may warrant replacement.',
  },

  costAnalysis: {
    title: 'Cost & Fee Analysis',
    whatItMeasures: 'Calculates total annual fees including fund expense ratios and any advisor fees. Fees compound over time and directly reduce your returns.',
    goodVsBad: 'GOOD/BAD thresholds depend on your advice model. Self-directed investors should aim for total fees under 0.50%. Advised portfolios can justify 1.0-1.5% for comprehensive planning and rebalancing services.',
    interpretation: 'A 1% fee difference over 20 years can reduce your ending balance by 20% or more. Ensure fees are justified by the value received.',
  },

  taxEfficiency: {
    title: 'Tax Efficiency',
    whatItMeasures: 'Identifies tax-loss harvesting opportunities (in taxable accounts only) and flags tax-inefficient asset placement.',
    goodVsBad: 'GOOD: Tax-inefficient assets (bonds, REITs) held in tax-advantaged accounts; losses harvested regularly. BAD: Bonds generating taxable interest in brokerage accounts; unharvested losses left on the table.',
    interpretation: 'Tax-loss harvesting applies ONLY to taxable/brokerage accounts—not IRAs or 401(k)s. Harvested losses can offset gains and up to $3,000 of ordinary income annually.',
  },

  diversification: {
    title: 'Diversification Quality',
    whatItMeasures: 'Evaluates number of holdings, asset class coverage, and concentration in top positions.',
    goodVsBad: `GOOD: ${DEFAULT_SCORING_CONFIG.diversification.smallPortfolioMinHoldings}-${DEFAULT_SCORING_CONFIG.diversification.smallPortfolioMaxHoldings} holdings for smaller portfolios, top 10 under ${(DEFAULT_SCORING_CONFIG.diversification.top10ConcentrationMax * 100).toFixed(0)}%. BAD: Too few holdings, or top positions dominating the portfolio regardless of total count.`,
    interpretation: 'More holdings isn\'t always better—over-diversification (50+ positions) can create hidden costs and complexity. The key is adequate spread without redundancy.',
  },

  riskAdjusted: {
    title: 'Risk-Adjusted Performance (Goal Probability)',
    whatItMeasures: 'Uses Monte Carlo-style analysis to estimate the probability of reaching your financial goal given current allocation, expected returns, and time horizon.',
    goodVsBad: `GOOD: ≥${DEFAULT_SCORING_CONFIG.goalProbability.greenMin}% probability is a comfortable margin. CAUTION: ${DEFAULT_SCORING_CONFIG.goalProbability.yellowMin}-${DEFAULT_SCORING_CONFIG.goalProbability.greenMin}% may require adjustments. BAD: <${DEFAULT_SCORING_CONFIG.goalProbability.yellowMin}% success rate means plan changes are likely needed.`,
    interpretation: 'Higher isn\'t always better—a 95% probability may mean you\'re taking less risk than necessary and could enjoy more flexibility or earlier retirement.',
  },

  crisisResilience: {
    title: 'Crisis Resilience',
    whatItMeasures: 'Simulates how your portfolio would have performed during historical crises (2000 Tech Crash, 2008 Financial Crisis, 2020 Covid Shock) compared to the S&P 500.',
    goodVsBad: 'GOOD: Portfolio loses LESS than S&P in downturns, showing defensive characteristics. BAD: Portfolio loses MORE than S&P, meaning higher exposure to market crashes.',
    interpretation: 'More aggressive portfolios will naturally have worse crisis resilience but higher long-term growth. The key is matching crisis exposure to your ability to stay invested during downturns.',
  },

  optimization: {
    title: 'Portfolio Optimization',
    whatItMeasures: `Estimates how much your Sharpe ratio could improve through rebalancing, fee reduction, and allocation adjustments toward the efficient frontier.`,
    goodVsBad: `GOOD: Current Sharpe near or above ${DEFAULT_SCORING_CONFIG.sharpe.portfolioTarget.toFixed(2)} target with limited improvement potential (<10%). BAD: Significant improvement possible (>15%) or current Sharpe well below target.`,
    interpretation: 'Optimization suggestions are directional guides, not guarantees. Implementation should consider tax implications and transaction costs.',
  },

  planningGaps: {
    title: 'Planning Gaps',
    whatItMeasures: 'Tracks completion of essential planning items: estate documents, beneficiary reviews, healthcare directives, insurance, emergency fund, and withdrawal strategy.',
    goodVsBad: `GOOD: ${DEFAULT_SCORING_CONFIG.planningGaps.greenMinComplete}+ of 7 items complete, especially critical items (will, POA, emergency fund). BAD: Critical gaps in estate planning or no emergency fund leave you exposed to unnecessary risk.`,
    interpretation: 'Financial planning is more than investments. Missing documents can cause family hardship and unnecessary costs during difficult times.',
  },
};

// ============================================================================
// STATUS LABELS
// ============================================================================
export const STATUS_LABELS = {
  GREEN: 'Good',
  YELLOW: 'Needs Attention',
  RED: 'Critical',
} as const;

// ============================================================================
// LOCAL STORAGE
// ============================================================================
export const SCORING_CONFIG_STORAGE_KEY = 'portfolio-diagnostic-scoring-config';

export function loadScoringConfig(): ScoringConfig {
  try {
    const stored = localStorage.getItem(SCORING_CONFIG_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SCORING_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load scoring config:', e);
  }
  return DEFAULT_SCORING_CONFIG;
}

export function saveScoringConfig(config: ScoringConfig): void {
  try {
    localStorage.setItem(SCORING_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save scoring config:', e);
  }
}
