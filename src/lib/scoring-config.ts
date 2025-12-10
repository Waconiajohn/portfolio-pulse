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

  // Lifetime Income Security
  lifetimeIncomeSecurity: {
    coreCoverageGreen: number;   // 100%+ of core covered = GREEN
    coreCoverageYellow: number;  // 80-100% = YELLOW
  };
}

// ============================================================================
// RISK TOLERANCE ADJUSTMENTS
// ============================================================================
export interface RiskToleranceAdjustments {
  maxSinglePositionPct: number;
  maxSectorPct: number;
  top10ConcentrationMax: number;
  top3ConcentrationMax: number;
  goalProbabilityGreenMin: number;
  goalProbabilityYellowMin: number;
  sharpeTarget: number;
  protectionHighRiskThreshold: number;
}

export const RISK_TOLERANCE_ADJUSTMENTS: Record<RiskTolerance, RiskToleranceAdjustments> = {
  Conservative: {
    maxSinglePositionPct: 0.08,       // Stricter: 8% max single position
    maxSectorPct: 0.25,               // Stricter: 25% max sector
    top10ConcentrationMax: 0.45,      // Stricter: 45% top 10
    top3ConcentrationMax: 0.35,       // Stricter: 35% top 3
    goalProbabilityGreenMin: 80,      // Higher bar for "Good"
    goalProbabilityYellowMin: 60,     // Higher bar for "Caution"
    sharpeTarget: 0.40,               // Lower Sharpe expectation (less risky = lower returns)
    protectionHighRiskThreshold: 6,   // More sensitive to risk areas
  },
  Moderate: {
    maxSinglePositionPct: 0.10,       // Default: 10%
    maxSectorPct: 0.30,               // Default: 30%
    top10ConcentrationMax: 0.50,      // Default: 50%
    top3ConcentrationMax: 0.40,       // Default: 40%
    goalProbabilityGreenMin: 75,      // Default
    goalProbabilityYellowMin: 50,     // Default
    sharpeTarget: 0.50,               // Default
    protectionHighRiskThreshold: 7,   // Default
  },
  Aggressive: {
    maxSinglePositionPct: 0.15,       // More lenient: 15% max single position
    maxSectorPct: 0.40,               // More lenient: 40% max sector
    top10ConcentrationMax: 0.60,      // More lenient: 60% top 10
    top3ConcentrationMax: 0.50,       // More lenient: 50% top 3
    goalProbabilityGreenMin: 65,      // Lower bar acceptable
    goalProbabilityYellowMin: 40,     // Lower bar acceptable
    sharpeTarget: 0.55,               // Higher Sharpe expectation (more risk = higher returns)
    protectionHighRiskThreshold: 8,   // Less sensitive to risk areas
  },
};

// Apply risk tolerance adjustments to a config
export function applyRiskToleranceAdjustments(
  baseConfig: ScoringConfig,
  riskTolerance: RiskTolerance
): ScoringConfig {
  const adjustments = RISK_TOLERANCE_ADJUSTMENTS[riskTolerance];
  
  return {
    ...baseConfig,
    riskManagement: {
      ...baseConfig.riskManagement,
      maxSinglePositionPct: adjustments.maxSinglePositionPct,
      maxSectorPct: adjustments.maxSectorPct,
    },
    diversification: {
      ...baseConfig.diversification,
      top10ConcentrationMax: adjustments.top10ConcentrationMax,
      top3ConcentrationMax: adjustments.top3ConcentrationMax,
    },
    goalProbability: {
      greenMin: adjustments.goalProbabilityGreenMin,
      yellowMin: adjustments.goalProbabilityYellowMin,
    },
    sharpe: {
      ...baseConfig.sharpe,
      portfolioTarget: adjustments.sharpeTarget,
      holdingGoodThreshold: adjustments.sharpeTarget,
    },
    protection: {
      ...baseConfig.protection,
      highRiskThreshold: adjustments.protectionHighRiskThreshold,
    },
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

  lifetimeIncomeSecurity: {
    coreCoverageGreen: 1.0,   // 100%+ of core covered
    coreCoverageYellow: 0.8,  // 80-100% = YELLOW
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
  riskToleranceNote?: string;
}

// Dynamic education content that references config values
export function getEducationContent(
  config: ScoringConfig,
  riskTolerance: RiskTolerance = 'Moderate'
): Record<string, EducationContent> {
  return {
    riskManagement: {
      title: 'Risk Management',
      whatItMeasures: 'Measures how well your portfolio aligns with your stated risk tolerance and whether any single position or sector creates excessive concentration risk.',
      goodVsBad: `GOOD: No single position exceeds ${(config.riskManagement.maxSinglePositionPct * 100).toFixed(0)}% of portfolio, no sector exceeds ${(config.riskManagement.maxSectorPct * 100).toFixed(0)}%, and volatility matches your risk profile. BAD: Large positions create "key person" risk where one stock's decline can significantly impact your wealth.`,
      interpretation: 'Conservative investors should have lower volatility and stricter concentration limits. Aggressive investors can tolerate more concentrated bets, but the same position limits still apply to manage tail risk.',
      riskToleranceNote: riskTolerance === 'Conservative' 
        ? 'As a Conservative investor, maintaining lower volatility and strict position limits is especially important.'
        : riskTolerance === 'Aggressive'
        ? 'As an Aggressive investor, you can accept higher volatility but position concentration still matters.'
        : 'As a Moderate investor, balance is key—reasonable concentration with moderate volatility.',
    },

    protection: {
      title: 'Protection & Vulnerability',
      whatItMeasures: 'Analyzes your portfolio\'s exposure to six key risk categories: inflation risk, interest rate risk, market crash risk, liquidity risk, geographic concentration, and sequence of returns risk.',
      goodVsBad: `GOOD: No critical vulnerabilities (scores above ${config.protection.highRiskThreshold}/10). BAD: One or more critical risks detected—your portfolio may be especially vulnerable in specific scenarios.`,
      interpretation: 'Each risk is scored 1-10. CRITICAL (>${config.protection.highRiskThreshold}) requires attention; HIGH (6-${config.protection.highRiskThreshold}) warrants monitoring. Mitigation strategies are provided for elevated risks.',
      riskToleranceNote: riskTolerance === 'Conservative'
        ? 'Given your Conservative profile, protection against downside risks should be prioritized. Higher crash risk scores are especially concerning.'
        : riskTolerance === 'Aggressive'
        ? 'Your Aggressive profile allows more crash exposure, but critical vulnerabilities in any category still warrant review.'
        : 'As a Moderate investor, balance protection and growth—no single category should be at critical levels.',
    },

    returnEfficiency: {
      title: 'Return Efficiency (Sharpe Ratio)',
      whatItMeasures: `Sharpe ratio measures return per unit of risk. A higher Sharpe means you're being compensated better for the risk you're taking. Your target: ${config.sharpe.portfolioTarget.toFixed(2)}.`,
      goodVsBad: `GOOD: Sharpe ≥90% of target (${(config.sharpe.portfolioTarget * 0.9).toFixed(2)}+). BELOW TARGET: 70-90% of target. POOR: <70% of target (${(config.sharpe.portfolioTarget * 0.7).toFixed(2)}) means returns are too low or volatility is too high.`,
      interpretation: `Holdings are labeled based on how close their individual Sharpe ratios are to your target. POOR holdings (<70% of target) are dragging down portfolio efficiency and may warrant replacement.`,
    },

    costAnalysis: {
      title: 'Cost & Fee Analysis',
      whatItMeasures: 'Calculates total annual fees including fund expense ratios and any advisor fees. Fees compound over time and directly reduce your returns.',
      goodVsBad: `GOOD/BAD thresholds depend on your advice model:\n• Self-Directed: ${(config.fees['self-directed'].greenMax * 100).toFixed(2)}% or less is good\n• Advisor Passive: ${(config.fees['advisor-passive'].greenMax * 100).toFixed(2)}% or less is good\n• Advisor Tactical: ${(config.fees['advisor-tactical'].greenMax * 100).toFixed(2)}% or less is good`,
      interpretation: 'A 1% fee difference over 20 years can reduce your ending balance by 20% or more. Ensure fees are justified by the value received.',
    },

    taxEfficiency: {
      title: 'Tax Efficiency',
      whatItMeasures: 'Identifies tax-loss harvesting opportunities (in taxable accounts only) and flags tax-inefficient asset placement.',
      goodVsBad: 'GOOD: Tax-inefficient assets (bonds, REITs) held in tax-advantaged accounts; losses harvested regularly. BAD: Bonds generating taxable interest in brokerage accounts; unharvested losses left on the table.',
      interpretation: 'Tax-loss harvesting applies ONLY to taxable/brokerage accounts—not IRAs or 401(k)s. Harvested losses can offset gains and up to $3,000 of ordinary income annually. Watch for wash sale rules.',
    },

    diversification: {
      title: 'Diversification Quality',
      whatItMeasures: 'Evaluates number of holdings, asset class coverage, and concentration in top positions.',
      goodVsBad: `GOOD: ${config.diversification.smallPortfolioMinHoldings}-${config.diversification.smallPortfolioMaxHoldings} holdings for smaller portfolios (<$${(config.diversification.smallPortfolioThreshold/1000).toFixed(0)}k), top 10 under ${(config.diversification.top10ConcentrationMax * 100).toFixed(0)}%. BAD: Too few holdings, or top positions dominating the portfolio regardless of total count.`,
      interpretation: 'More holdings isn\'t always better—over-diversification (50+ positions) can create hidden costs and complexity. The key is adequate spread without redundancy.',
    },

    riskAdjusted: {
      title: 'Risk-Adjusted Performance (Goal Probability)',
      whatItMeasures: 'Uses Monte Carlo-style analysis to estimate the probability of reaching your financial goal given current allocation, expected returns, and time horizon.',
      goodVsBad: `GOOD: ≥${config.goalProbability.greenMin}% probability is a comfortable margin. CAUTION: ${config.goalProbability.yellowMin}-${config.goalProbability.greenMin}% may require adjustments. BAD: <${config.goalProbability.yellowMin}% success rate means plan changes are likely needed.`,
      interpretation: 'Higher isn\'t always better—a 95% probability may mean you\'re taking less risk than necessary and could enjoy more flexibility or earlier retirement.',
      riskToleranceNote: riskTolerance === 'Conservative'
        ? 'Conservative investors typically want 80%+ probability for peace of mind.'
        : riskTolerance === 'Aggressive'
        ? 'Aggressive investors may accept lower probability in exchange for higher upside.'
        : undefined,
    },

    crisisResilience: {
      title: 'Crisis Resilience',
      whatItMeasures: 'Simulates how your portfolio would have performed during historical crises (2000 Tech Crash, 2008 Financial Crisis, 2020 Covid Shock) compared to the S&P 500.',
      goodVsBad: `GOOD: Portfolio loses LESS than S&P in downturns (by more than ${(config.crisisResilience.betterThanSpThreshold * 100).toFixed(0)}%), showing defensive characteristics. BAD: Portfolio loses MORE than S&P, meaning higher exposure to market crashes.`,
      interpretation: 'More aggressive portfolios will naturally have worse crisis resilience but higher long-term growth. The key is matching crisis exposure to your ability to stay invested during downturns.',
      riskToleranceNote: riskTolerance === 'Conservative'
        ? 'Your Conservative profile suggests crisis resilience should be a priority.'
        : riskTolerance === 'Aggressive'
        ? 'As an Aggressive investor, some underperformance in crashes is acceptable for long-term growth.'
        : undefined,
    },

    optimization: {
      title: 'Portfolio Optimization',
      whatItMeasures: `Estimates how much your Sharpe ratio could improve through rebalancing, fee reduction, and allocation adjustments toward the efficient frontier.`,
      goodVsBad: `GOOD: Current Sharpe near or above ${config.sharpe.portfolioTarget.toFixed(2)} target with limited improvement potential (<10%). BAD: Significant improvement possible (>15%) or current Sharpe well below target.`,
      interpretation: 'Optimization suggestions are directional guides, not guarantees. Implementation should consider tax implications and transaction costs.',
    },

    planningGaps: {
      title: 'Planning Gaps',
      whatItMeasures: 'Tracks completion of essential planning items: estate documents, beneficiary reviews, healthcare directives, insurance, emergency fund, and withdrawal strategy.',
      goodVsBad: `GOOD: ${config.planningGaps.greenMinComplete}+ of 7 items complete, especially critical items (will, POA, emergency fund). BAD: Critical gaps in estate planning or no emergency fund leave you exposed to unnecessary risk.`,
      interpretation: 'Financial planning is more than investments. Missing documents can cause family hardship and unnecessary costs during difficult times.',
    },

    lifetimeIncomeSecurity: {
      title: 'Lifetime Income Security',
      whatItMeasures: 'Measures how well guaranteed income sources (Social Security, pensions, annuities) cover your core living expenses for life.',
      goodVsBad: `GOOD: Guaranteed income covers ≥${(config.lifetimeIncomeSecurity.coreCoverageGreen * 100).toFixed(0)}% of core expenses. NEEDS ATTENTION: ${(config.lifetimeIncomeSecurity.coreCoverageYellow * 100).toFixed(0)}-99% coverage. CRITICAL: <${(config.lifetimeIncomeSecurity.coreCoverageYellow * 100).toFixed(0)}% coverage leaves lifestyle dependent on market returns.`,
      interpretation: 'When core expenses are fully covered by guarantees, the remaining portfolio can be managed more aggressively for discretionary and legacy goals without increasing lifestyle risk.',
      riskToleranceNote: riskTolerance === 'Conservative'
        ? 'Conservative investors especially benefit from guaranteed income covering 100%+ of core expenses to minimize market dependency.'
        : riskTolerance === 'Aggressive'
        ? 'Even aggressive investors should ensure core living expenses have guaranteed coverage before taking portfolio risk.'
        : 'Securing core expenses with guarantees allows the portfolio to focus on growth, discretionary spending, and legacy.',
    },
  };
}

// Static content for backward compatibility (uses defaults)
export const EDUCATION_CONTENT: Record<string, EducationContent> = getEducationContent(DEFAULT_SCORING_CONFIG);

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
