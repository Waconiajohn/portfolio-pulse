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
  greenMax: number;
  yellowMax: number;
}

// ============================================================================
// SCORING CONFIGURATION
// ============================================================================
export interface ScoringConfig {
  statusThresholds: {
    greenMin: number;
    yellowMin: number;
  };

  riskManagement: {
    maxSinglePositionPct: number;
    maxSectorPct: number;
    maxCountryPct: number;
    riskGapSevereThreshold: number;
    riskGapWarningThreshold: number;
  };

  sharpe: {
    portfolioTarget: number;
    holdingGoodThreshold: number;
    holdingNeutralOffset: number;
  };

  fees: Record<AdviceModel, FeeThresholds>;

  diversification: {
    smallPortfolioThreshold: number;
    smallPortfolioMinHoldings: number;
    smallPortfolioMaxHoldings: number;
    largePortfolioMinHoldings: number;
    largePortfolioMaxHoldings: number;
    top10ConcentrationMax: number;
    top3ConcentrationMax: number;
  };

  goalProbability: {
    greenMin: number;
    yellowMin: number;
  };

  crisisResilience: {
    betterThanSpThreshold: number;
    similarToSpRange: number;
  };

  planningGaps: {
    greenMinComplete: number;
    yellowMinComplete: number;
    criticalItems: string[];
  };

  protection: {
    highRiskThreshold: number;
    maxHighRiskAreas: number;
  };

  lifetimeIncomeSecurity: {
    coreCoverageGreen: number;
    coreCoverageYellow: number;
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
    maxSinglePositionPct: 0.08,
    maxSectorPct: 0.25,
    top10ConcentrationMax: 0.45,
    top3ConcentrationMax: 0.35,
    goalProbabilityGreenMin: 80,
    goalProbabilityYellowMin: 60,
    sharpeTarget: 0.40,
    protectionHighRiskThreshold: 6,
  },
  Moderate: {
    maxSinglePositionPct: 0.10,
    maxSectorPct: 0.30,
    top10ConcentrationMax: 0.50,
    top3ConcentrationMax: 0.40,
    goalProbabilityGreenMin: 75,
    goalProbabilityYellowMin: 50,
    sharpeTarget: 0.50,
    protectionHighRiskThreshold: 7,
  },
  Aggressive: {
    maxSinglePositionPct: 0.15,
    maxSectorPct: 0.40,
    top10ConcentrationMax: 0.60,
    top3ConcentrationMax: 0.50,
    goalProbabilityGreenMin: 65,
    goalProbabilityYellowMin: 40,
    sharpeTarget: 0.55,
    protectionHighRiskThreshold: 8,
  },
};

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
    greenMinComplete: 9,
    yellowMinComplete: 6,
    criticalItems: ['willTrust', 'healthcareDirectives', 'poaDirectives', 'emergencyFund'],
  },

  protection: {
    highRiskThreshold: 7,
    maxHighRiskAreas: 2,
  },

  lifetimeIncomeSecurity: {
    coreCoverageGreen: 1.0,
    coreCoverageYellow: 0.8,
  },
};

// ============================================================================
// EDUCATION CONTENT FOR EACH DIAGNOSTIC CATEGORY (Updated for consolidated categories)
// ============================================================================
export interface EducationContent {
  title: string;
  whatItMeasures: string;
  goodVsBad: string;
  interpretation: string;
  riskToleranceNote?: string;
}

export function getEducationContent(
  config: ScoringConfig,
  riskTolerance: RiskTolerance = 'Moderate'
): Record<string, EducationContent> {
  return {
    riskDiversification: {
      title: 'Risk & Diversification',
      whatItMeasures: 'Combines risk management (volatility alignment, position concentration) with diversification quality (holdings count, asset class coverage, top position concentration). Evaluates whether your portfolio is well-balanced and appropriately sized for your risk tolerance.',
      goodVsBad: `GOOD: No single position exceeds ${(config.riskManagement.maxSinglePositionPct * 100).toFixed(0)}%, top 10 holdings under ${(config.diversification.top10ConcentrationMax * 100).toFixed(0)}%, adequate asset class coverage. BAD: Large positions create "key person" risk; poor diversification amplifies volatility.`,
      interpretation: 'Even portfolios with many holdings can be poorly diversified if the top few positions dominate. True diversification means no single investment can materially impact your portfolio.',
      riskToleranceNote: riskTolerance === 'Conservative' 
        ? 'As a Conservative investor, stricter concentration limits and lower volatility are especially important.'
        : riskTolerance === 'Aggressive'
        ? 'As an Aggressive investor, you can tolerate higher concentration, but position limits still matter for tail risk.'
        : 'As a Moderate investor, balance is key—reasonable concentration with moderate volatility.',
    },

    downsideResilience: {
      title: 'Downside Risk & Resilience',
      whatItMeasures: 'Combines vulnerability analysis (6 risk categories: inflation, interest rate, crash, liquidity, geographic, sequence) with historical crisis simulations (2000 Tech Crash, 2008 Financial Crisis, 2020 Covid Shock). Shows how protected your portfolio is against major downturns.',
      goodVsBad: `GOOD: No critical vulnerabilities, portfolio loses LESS than S&P 500 in crisis scenarios. BAD: Multiple high-risk areas and/or severe projected losses in historical crash simulations.`,
      interpretation: 'This analysis combines forward-looking vulnerability assessment with backward-looking crisis performance. Even if you outperform S&P in crashes, severe absolute losses may still be concerning depending on your timeline.',
      riskToleranceNote: riskTolerance === 'Conservative'
        ? 'Given your Conservative profile, downside protection should be a priority. High crash risk scores are especially concerning.'
        : riskTolerance === 'Aggressive'
        ? 'Your Aggressive profile accepts more crash exposure, but critical vulnerabilities still warrant review.'
        : 'As a Moderate investor, balance protection and growth—no single category should be at critical levels.',
    },

    performanceOptimization: {
      title: 'Performance & Optimization',
      whatItMeasures: `Combines return efficiency (Sharpe ratio measuring return per unit of risk) with optimization potential (how much improvement is possible through rebalancing and fee reduction). Target Sharpe: ${config.sharpe.portfolioTarget.toFixed(2)}.`,
      goodVsBad: `GOOD: Sharpe ≥90% of target with limited optimization upside (<10%). POOR: Sharpe <70% of target and/or >15% improvement potential indicates inefficient portfolio positioning.`,
      interpretation: 'Holdings are labeled based on individual Sharpe ratios. POOR holdings (<70% of target) drag down portfolio efficiency. Optimization potential shows actionable improvements through rebalancing, fee reduction, or replacing inefficient holdings.',
    },

    costAnalysis: {
      title: 'Cost & Fee Analysis',
      whatItMeasures: 'Calculates total annual fees including fund expense ratios and advisor fees. Fees compound over time and directly reduce your returns.',
      goodVsBad: `GOOD/BAD thresholds depend on your advice model:\n• Self-Directed: ${(config.fees['self-directed'].greenMax * 100).toFixed(2)}% or less is good\n• Advisor Passive: ${(config.fees['advisor-passive'].greenMax * 100).toFixed(2)}% or less is good\n• Advisor Tactical: ${(config.fees['advisor-tactical'].greenMax * 100).toFixed(2)}% or less is good`,
      interpretation: 'A 1% fee difference over 20 years can reduce your ending balance by 20% or more. Ensure fees are justified by the value received.',
    },

    taxEfficiency: {
      title: 'Tax Efficiency',
      whatItMeasures: 'Identifies tax-loss harvesting opportunities (in taxable accounts only) and flags tax-inefficient asset placement.',
      goodVsBad: 'GOOD: Tax-inefficient assets (bonds, REITs) held in tax-advantaged accounts; losses harvested regularly. BAD: Bonds generating taxable interest in brokerage accounts; unharvested losses left on the table.',
      interpretation: 'Tax-loss harvesting applies ONLY to taxable/brokerage accounts—not IRAs or 401(k)s. Harvested losses can offset gains and up to $3,000 of ordinary income annually. Watch for wash sale rules.',
    },

    riskAdjusted: {
      title: 'Risk-Adjusted Performance (Goal Probability)',
      whatItMeasures: 'Uses Monte Carlo-style analysis to estimate the probability of reaching your financial goal given current allocation, expected returns, and time horizon.',
      goodVsBad: `GOOD: ≥${config.goalProbability.greenMin}% probability is a comfortable margin. CAUTION: ${config.goalProbability.yellowMin}-${config.goalProbability.greenMin}% may require adjustments. BAD: <${config.goalProbability.yellowMin}% success rate means plan changes are likely needed.`,
      interpretation: 'Higher isn\'t always better—a 95% probability may mean you\'re taking less risk than necessary. If core expenses are covered by guaranteed income, this probability applies only to discretionary/legacy goals.',
      riskToleranceNote: riskTolerance === 'Conservative'
        ? 'Conservative investors typically want 80%+ probability for peace of mind.'
        : riskTolerance === 'Aggressive'
        ? 'Aggressive investors may accept lower probability in exchange for higher upside.'
        : undefined,
    },

    planningGaps: {
      title: 'Planning Gaps',
      whatItMeasures: 'Tracks completion of 11 essential planning items: estate documents, healthcare directives, POA, beneficiaries, executor/guardian designations, insurance, emergency fund, withdrawal strategy, and investment policy statement.',
      goodVsBad: `GOOD: ${config.planningGaps.greenMinComplete}+ of 11 items complete, especially critical items (will, healthcare directives, POA, emergency fund). BAD: Critical gaps in estate planning or no emergency fund leave you exposed to unnecessary risk.`,
      interpretation: 'Financial planning is more than investments. Missing documents can cause family hardship and unnecessary costs during difficult times. ASAP items should be addressed immediately.',
    },

    lifetimeIncomeSecurity: {
      title: 'Lifetime Income Security',
      whatItMeasures: 'Measures how well guaranteed income sources (Social Security, pensions, annuities) cover your core living expenses for life.',
      goodVsBad: `GOOD: ${(config.lifetimeIncomeSecurity.coreCoverageGreen * 100).toFixed(0)}%+ of core expenses covered by guaranteed income. CAUTION: ${(config.lifetimeIncomeSecurity.coreCoverageYellow * 100).toFixed(0)}-${(config.lifetimeIncomeSecurity.coreCoverageGreen * 100).toFixed(0)}% coverage. BAD: <${(config.lifetimeIncomeSecurity.coreCoverageYellow * 100).toFixed(0)}% means basic lifestyle depends on market performance.`,
      interpretation: 'When guaranteed income covers core expenses, market volatility becomes irrelevant for your essential lifestyle. This fundamentally changes your risk capacity and investment strategy.',
    },
  };
}

// ============================================================================
// CONFIG PERSISTENCE
// ============================================================================
const STORAGE_KEY = 'portfolio-scoring-config';

export function saveScoringConfig(config: ScoringConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save scoring config:', e);
  }
}

export function loadScoringConfig(): ScoringConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SCORING_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load scoring config:', e);
  }
  return DEFAULT_SCORING_CONFIG;
}
