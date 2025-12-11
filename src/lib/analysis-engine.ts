import {
  Holding,
  ClientInfo,
  PortfolioAnalysis,
  DiagnosticResult,
  DiagnosticStatus,
  Recommendation,
  PlanningChecklist,
  AssetClass,
  LifetimeIncomeInputs,
} from '@/types/portfolio';
import {
  EXPECTED_RETURNS,
  VOLATILITY,
  TICKER_ESTIMATES,
  TARGET_VOLATILITY,
  RISK_FREE_RATE,
  DEFAULT_EXPENSE_RATIOS,
  CRISIS_SCENARIOS,
  SECTOR_MAPPING,
} from './constants';
import { ScoringConfig, DEFAULT_SCORING_CONFIG, AdviceModel } from './scoring-config';

// ============================================================================
// HELPER: Get status from score using config thresholds
// ============================================================================
function getStatus(score: number, config: ScoringConfig = DEFAULT_SCORING_CONFIG): DiagnosticStatus {
  if (score >= config.statusThresholds.greenMin) return 'GREEN';
  if (score >= config.statusThresholds.yellowMin) return 'YELLOW';
  return 'RED';
}

// ============================================================================
// HELPER: Format percentage
// ============================================================================
function formatPct(value: number, decimals: number = 1): string {
  return (value * 100).toFixed(decimals);
}

// ============================================================================
// CORE PORTFOLIO METRICS
// ============================================================================
function calculatePortfolioMetrics(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.costBasis, 0);
  
  if (totalValue === 0) {
    return { totalValue: 0, totalCost: 0, expectedReturn: 0, volatility: 0, sharpeRatio: 0, totalFees: 0 };
  }

  let weightedReturn = 0;
  let weightedVolatility = 0;
  let totalFees = 0;

  holdings.forEach(h => {
    const value = h.shares * h.currentPrice;
    const weight = value / totalValue;
    const assetReturn = EXPECTED_RETURNS[h.assetClass] || 0.06;
    const assetVol = VOLATILITY[h.assetClass] || 0.12;
    const expenseRatio = h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf;

    weightedReturn += weight * assetReturn;
    weightedVolatility += weight * assetVol;
    totalFees += value * expenseRatio;
  });

  const sharpeRatio = weightedVolatility > 0 
    ? (weightedReturn - RISK_FREE_RATE) / weightedVolatility 
    : 0;

  return {
    totalValue,
    totalCost,
    expectedReturn: weightedReturn,
    volatility: weightedVolatility,
    sharpeRatio,
    totalFees,
  };
}

// ============================================================================
// 1. RISK & DIVERSIFICATION (Merged: Risk Management + Diversification)
// ============================================================================
function analyzeRiskAndDiversification(
  holdings: Holding[], 
  clientInfo: ClientInfo, 
  totalValue: number, 
  volatility: number,
  config: ScoringConfig
): DiagnosticResult {
  const targetVol = TARGET_VOLATILITY[clientInfo.riskTolerance];
  const riskGap = Math.abs(volatility - targetVol) / targetVol;
  
  // Position concentration
  const positions = holdings.map(h => ({
    ticker: h.ticker,
    weight: (h.shares * h.currentPrice) / totalValue,
  })).sort((a, b) => b.weight - a.weight);
  
  const topPosition = positions[0]?.weight || 0;
  const maxPosPct = config.riskManagement.maxSinglePositionPct;
  const hasConcentration = topPosition > maxPosPct;

  // Sector concentration
  const sectorWeights: Record<string, number> = {};
  holdings.forEach(h => {
    const sector = SECTOR_MAPPING[h.ticker] || 'Other';
    const weight = (h.shares * h.currentPrice) / totalValue;
    sectorWeights[sector] = (sectorWeights[sector] || 0) + weight;
  });
  const topSector = Math.max(...Object.values(sectorWeights), 0);
  const hasSectorConcentration = topSector > config.riskManagement.maxSectorPct;

  // Diversification metrics
  const numHoldings = holdings.length;
  const isLargePortfolio = totalValue >= config.diversification.smallPortfolioThreshold;
  const minHoldings = isLargePortfolio 
    ? config.diversification.largePortfolioMinHoldings 
    : config.diversification.smallPortfolioMinHoldings;
  const maxHoldings = isLargePortfolio 
    ? config.diversification.largePortfolioMaxHoldings 
    : config.diversification.smallPortfolioMaxHoldings;

  // Asset class distribution
  const assetClassWeights: Record<AssetClass, number> = {
    'US Stocks': 0, 'Intl Stocks': 0, 'Bonds': 0, 'Commodities': 0, 'Cash': 0, 'Other': 0
  };
  holdings.forEach(h => {
    const weight = (h.shares * h.currentPrice) / totalValue;
    assetClassWeights[h.assetClass] += weight;
  });

  // Top position analysis
  const top3Weight = positions.slice(0, 3).reduce((sum, h) => sum + h.weight, 0);
  const top10Weight = positions.slice(0, 10).reduce((sum, h) => sum + h.weight, 0);

  const tooFewHoldings = numHoldings < minHoldings;
  const tooManyHoldings = numHoldings > maxHoldings;
  const top10TooConcentrated = top10Weight > config.diversification.top10ConcentrationMax;
  const top3TooConcentrated = top3Weight > config.diversification.top3ConcentrationMax;

  // Combined Scoring
  let score = 100;
  // Risk management deductions
  if (riskGap > config.riskManagement.riskGapSevereThreshold) score -= 25;
  else if (riskGap > config.riskManagement.riskGapWarningThreshold) score -= 12;
  if (hasConcentration) score -= 20;
  if (hasSectorConcentration) score -= 12;
  // Diversification deductions
  if (tooFewHoldings) score -= 15;
  else if (tooManyHoldings) score -= 5;
  if (top10TooConcentrated) score -= 12;
  if (top3TooConcentrated) score -= 10;
  if (assetClassWeights['Bonds'] < 0.1 && assetClassWeights['US Stocks'] > 0.7) score -= 8;

  const status = getStatus(score, config);

  // Key finding - prioritize most critical issue
  const diversEducation = "Diversification reduces the impact of any single investment on your portfolio. Concentration creates 'key person' risk.";
  const assetClassCount = Object.values(assetClassWeights).filter(w => w > 0).length;
  
  let keyFinding: string;
  if (hasConcentration) {
    keyFinding = `Top position (${positions[0]?.ticker}) is ${formatPct(topPosition)}% – ABOVE the ${formatPct(maxPosPct, 0)}% guideline. ${top3TooConcentrated ? `Top 3 positions = ${formatPct(top3Weight, 0)}% of portfolio.` : ''} ${diversEducation}`;
  } else if (top3TooConcentrated) {
    keyFinding = `Top 3 positions = ${formatPct(top3Weight, 0)}% of portfolio – a bad quarter for just 3 stocks could significantly impact your wealth. ${diversEducation}`;
  } else if (hasSectorConcentration) {
    keyFinding = `Top sector is ${formatPct(topSector)}% of portfolio, exceeding ${formatPct(config.riskManagement.maxSectorPct, 0)}% guideline. Sector concentration amplifies industry-specific risks. ${diversEducation}`;
  } else if (riskGap > config.riskManagement.riskGapSevereThreshold) {
    const direction = volatility > targetVol ? 'higher' : 'lower';
    keyFinding = `Portfolio volatility is significantly ${direction} than your ${clientInfo.riskTolerance} target. ${tooFewHoldings ? `Only ${numHoldings} holdings provides limited diversification.` : ''} ${diversEducation}`;
  } else if (tooFewHoldings) {
    keyFinding = `Only ${numHoldings} holdings provides limited diversification. Consider 15-40 positions for better risk distribution. ${diversEducation}`;
  } else if (status === 'GREEN') {
    keyFinding = `${numHoldings} holdings across ${assetClassCount} asset classes with top position at ${formatPct(topPosition)}%. Risk and diversification are well-balanced for your ${clientInfo.riskTolerance} profile.`;
  } else {
    keyFinding = `Some concentration or diversification adjustments may improve portfolio stability. ${diversEducation}`;
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Top Position: ${formatPct(topPosition)}% | Top 10: ${formatPct(top10Weight, 0)}%`,
    details: {
      // Risk management details
      currentVolatility: volatility,
      targetVolatility: targetVol,
      riskGap,
      topPositions: positions.slice(0, 5),
      sectorWeights,
      hasConcentration,
      hasSectorConcentration,
      maxSinglePositionPct: maxPosPct,
      maxSectorPct: config.riskManagement.maxSectorPct,
      // Diversification details
      numHoldings,
      assetClassWeights,
      top3: positions.slice(0, 3),
      top10: positions.slice(0, 10),
      top3Weight,
      top10Weight,
      holdingCountLabel: tooFewHoldings ? 'TOO FEW' : tooManyHoldings ? 'TOO MANY' : 'ADEQUATE',
      minHoldings,
      maxHoldings,
      isLargePortfolio,
    },
  };
}

// ============================================================================
// 2. DOWNSIDE RISK & RESILIENCE (Merged: Protection + Crisis Resilience)
// ============================================================================
interface ProtectionRiskDetail {
  name: string;
  label: string;
  score: number;
  maxScore: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation: string;
}

function analyzeDownsideResilience(
  holdings: Holding[], 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
  if (totalValue === 0) {
    return {
      status: 'YELLOW',
      score: 50,
      keyFinding: 'No holdings to analyze for downside resilience',
      headlineMetric: 'N/A',
      details: { riskDetails: [], scenarios: [], stockWeight: 0, bondWeight: 0 },
    };
  }

  const stockWeight = holdings
    .filter(h => h.assetClass === 'US Stocks' || h.assetClass === 'Intl Stocks')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;
  
  const bondWeight = holdings
    .filter(h => h.assetClass === 'Bonds')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;
  
  const commodityWeight = holdings
    .filter(h => h.assetClass === 'Commodities')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;
  
  const cashWeight = holdings
    .filter(h => h.assetClass === 'Cash')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;
  
  const intlWeight = holdings
    .filter(h => h.assetClass === 'Intl Stocks')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;

  const threshold = config.protection.highRiskThreshold;

  // Calculate detailed risk scores
  const getSeverity = (score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' => {
    if (score <= 3) return 'LOW';
    if (score <= 5) return 'MODERATE';
    if (score <= threshold) return 'HIGH';
    return 'CRITICAL';
  };

  const riskDetails: ProtectionRiskDetail[] = [
    {
      name: 'inflationRisk',
      label: 'Inflation Risk',
      score: Math.round(Math.max(2, 10 - (commodityWeight * 20) - (stockWeight * 5) - (bondWeight * 2))),
      maxScore: 10,
      severity: 'LOW',
      description: 'Inflation erodes purchasing power over time. With 3% inflation, $100,000 today buys only $74,000 worth of goods in 10 years.',
      mitigation: 'Consider TIPS, commodities, real estate, or I-Bonds to maintain purchasing power',
    },
    {
      name: 'interestRateRisk',
      label: 'Interest Rate Risk',
      score: Math.round(bondWeight * 8 + (bondWeight > 0.4 ? 2 : 0)),
      maxScore: 10,
      severity: 'LOW',
      description: 'When interest rates rise, existing bond values fall. Longer-duration bonds are more sensitive.',
      mitigation: 'Shorten bond duration or ladder maturities to reduce rate sensitivity',
    },
    {
      name: 'marketCrashRisk',
      label: 'Market Crash Risk',
      score: Math.round(stockWeight * 10),
      maxScore: 10,
      severity: 'LOW',
      description: 'Equity markets can drop 30-50% in severe downturns. Recovery can take years.',
      mitigation: 'Add defensive assets (bonds, cash) or consider downside protection strategies',
    },
    {
      name: 'liquidityRisk',
      label: 'Liquidity Risk',
      score: Math.round(Math.max(1, 5 - (cashWeight * 20))),
      maxScore: 10,
      severity: 'LOW',
      description: 'Risk of being forced to sell investments at a loss to meet cash needs during market downturns.',
      mitigation: 'Maintain 6-12 months emergency fund in cash or money market',
    },
    {
      name: 'concentrationRisk',
      label: 'Geographic Concentration',
      score: Math.round((1 - intlWeight) * 6),
      maxScore: 10,
      severity: 'LOW',
      description: 'Over-reliance on one country\'s market increases vulnerability to regional economic issues.',
      mitigation: 'Add 20-40% international diversification to reduce country-specific risk',
    },
    {
      name: 'sequenceRisk',
      label: 'Sequence of Returns Risk',
      score: Math.round(stockWeight > 0.7 ? 7 : stockWeight > 0.5 ? 5 : 3),
      maxScore: 10,
      severity: 'LOW',
      description: 'Poor returns early in retirement, combined with withdrawals, can permanently deplete a portfolio.',
      mitigation: 'BEST SOLUTION: Establish guaranteed lifetime income (annuities, Social Security optimization) sufficient to cover core living expenses. This eliminates sequence risk for essential needs.',
    },
  ];

  // Update severity based on calculated scores
  riskDetails.forEach(risk => {
    risk.severity = getSeverity(risk.score);
  });

  // Crisis scenario analysis
  const scenarios = Object.entries(CRISIS_SCENARIOS).map(([key, scenario]) => ({
    name: scenario.name,
    portfolioImpact: stockWeight * scenario.equity + bondWeight * scenario.bonds,
    spImpact: scenario.equity,
  }));

  const avgImpact = scenarios.reduce((sum, s) => sum + s.portfolioImpact, 0) / scenarios.length;
  const avgSpImpact = scenarios.reduce((sum, s) => sum + s.spImpact, 0) / scenarios.length;
  
  // Compare portfolio to S&P - both are NEGATIVE numbers
  const portfolioLosesLess = avgImpact > avgSpImpact + config.crisisResilience.betterThanSpThreshold;
  const portfolioLosesMore = avgImpact < avgSpImpact - config.crisisResilience.betterThanSpThreshold;

  const criticalRisks = riskDetails.filter(r => r.severity === 'CRITICAL');
  const highRisks = riskDetails.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL');

  // Combined Scoring (Protection + Crisis)
  let score = 100;
  // Protection deductions
  score -= criticalRisks.length * 18;
  score -= highRisks.filter(r => r.severity === 'HIGH').length * 10;
  // Crisis severity deductions
  const avgLossSeverity = Math.abs(avgImpact);
  if (avgLossSeverity > 0.45) score -= 20;
  else if (avgLossSeverity > 0.35) score -= 12;
  else if (avgLossSeverity > 0.25) score -= 5;
  // Bonus for beating S&P in crashes
  if (portfolioLosesLess) score = Math.min(100, score + 8);

  score = Math.max(0, Math.min(100, score));
  const status = getStatus(score, config);

  // Comparison text for crisis
  let comparisonText: string;
  if (portfolioLosesLess) {
    comparisonText = `loses LESS than S&P 500 (avg ${formatPct(avgImpact, 0)}% vs S&P ${formatPct(avgSpImpact, 0)}%)`;
  } else if (portfolioLosesMore) {
    comparisonText = `loses MORE than S&P 500 (avg ${formatPct(avgImpact, 0)}% vs S&P ${formatPct(avgSpImpact, 0)}%)`;
  } else {
    comparisonText = `performs similarly to S&P 500 in crashes (avg ${formatPct(avgImpact, 0)}%)`;
  }

  // Build key finding combining protection vulnerabilities and crisis resilience
  const resilienceEducation = "This analysis combines vulnerability assessment (6 risk categories) with historical crisis simulations.";
  
  let keyFinding: string;
  if (criticalRisks.length >= 2) {
    keyFinding = `CRITICAL vulnerabilities in ${criticalRisks.map(r => r.label).join(' and ')}. In past crises, portfolio ${comparisonText}. ${resilienceEducation}`;
  } else if (criticalRisks.length === 1) {
    keyFinding = `CRITICAL: ${criticalRisks[0].label} (${criticalRisks[0].score}/10). In crises, portfolio ${comparisonText}. ${criticalRisks[0].mitigation}`;
  } else if (highRisks.length >= 2) {
    keyFinding = `Elevated risk in ${highRisks.map(r => r.label).join(' and ')}. Historical crisis simulation shows portfolio ${comparisonText}. ${resilienceEducation}`;
  } else if (avgLossSeverity > 0.35) {
    keyFinding = `Significant crisis exposure: portfolio ${comparisonText}. While manageable, a major downturn could cause substantial temporary losses. ${resilienceEducation}`;
  } else if (status === 'GREEN') {
    keyFinding = `Portfolio shows strong downside protection. In crisis simulations, ${comparisonText}. ${criticalRisks.length === 0 ? 'No critical vulnerabilities detected.' : ''}`;
  } else {
    keyFinding = `Some downside risk exposures present. Crisis simulation shows portfolio ${comparisonText}. ${resilienceEducation}`;
  }

  const worstRisk = riskDetails.reduce((worst, r) => r.score > worst.score ? r : worst, riskDetails[0]);

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Crisis Avg: ${formatPct(avgImpact, 0)}% | ${criticalRisks.length} critical, ${highRisks.length - criticalRisks.length} elevated risks`,
    details: { 
      // Protection details
      riskDetails,
      stockWeight, 
      bondWeight, 
      commodityWeight,
      cashWeight,
      intlWeight,
      threshold,
      criticalCount: criticalRisks.length,
      elevatedCount: highRisks.length,
      worstRisk: worstRisk.label,
      // Crisis resilience details
      scenarios,
      avgImpact,
      avgSpImpact,
      portfolioLosesLess,
      portfolioLosesMore,
      comparisonText,
    },
  };
}

// ============================================================================
// 3. PERFORMANCE & OPTIMIZATION (Merged: Return Efficiency + Optimization)
// ============================================================================
import { ADVICE_MODEL_LABELS } from './scoring-config';

function analyzePerformanceAndOptimization(
  holdings: Holding[], 
  totalValue: number, 
  expectedReturn: number, 
  volatility: number, 
  sharpeRatio: number,
  totalFees: number,
  config: ScoringConfig
): DiagnosticResult {
  const targetSharpe = config.sharpe.portfolioTarget;
  const sharpeRatio100 = targetSharpe > 0 ? (sharpeRatio / targetSharpe) * 100 : 0;
  
  // Calculate holding-level Sharpe using ticker-specific data when available
  const holdingEfficiency = holdings.map(h => {
    const value = h.shares * h.currentPrice;
    const weight = value / totalValue;
    
    const tickerData = TICKER_ESTIMATES[h.ticker.toUpperCase()];
    const assetReturn = tickerData?.expectedReturn || EXPECTED_RETURNS[h.assetClass] || 0.06;
    const assetVol = tickerData?.volatility || VOLATILITY[h.assetClass] || 0.12;
    const holdingSharpe = assetVol > 0 ? (assetReturn - RISK_FREE_RATE) / assetVol : 0;
    const usesTickerData = !!tickerData;
    
    const pctOfTarget = targetSharpe > 0 ? holdingSharpe / targetSharpe : 0;
    let contribution: 'GOOD' | 'BELOW TARGET' | 'POOR';
    if (pctOfTarget >= 0.90) contribution = 'GOOD';
    else if (pctOfTarget >= 0.70) contribution = 'BELOW TARGET';
    else contribution = 'POOR';

    return { 
      ticker: h.ticker, 
      sharpe: holdingSharpe, 
      contribution, 
      weight,
      pctOfTarget: Math.round(pctOfTarget * 100),
      expectedReturn: assetReturn,
      volatility: assetVol,
      usesTickerData,
    };
  });

  const tickerDataCount = holdingEfficiency.filter(h => h.usesTickerData).length;
  const assetClassCount = holdingEfficiency.length - tickerDataCount;

  // Optimization potential calculation
  const feeReduction = Math.min(0.02, (totalFees / totalValue) * 0.5);
  const rebalanceImprovement = Math.min(0.03, volatility * 0.08);
  const optimizedReturn = expectedReturn + feeReduction;
  const optimizedVol = Math.max(0.03, volatility - rebalanceImprovement);
  const optimizedSharpe = optimizedVol > 0 ? (optimizedReturn - RISK_FREE_RATE) / optimizedVol : 0;
  
  const absoluteImprovement = optimizedSharpe - sharpeRatio;
  const relativeImprovement = sharpeRatio > 0 ? absoluteImprovement / sharpeRatio : 0;

  // Combined scoring - stricter approach
  let score: number;
  // Current efficiency score (80% weight) - primary driver
  let efficiencyScore: number;
  if (sharpeRatio >= targetSharpe) {
    efficiencyScore = 80 + Math.min(20, (sharpeRatio - targetSharpe) * 20);
  } else if (sharpeRatio100 >= 90) {
    efficiencyScore = 70 + (sharpeRatio100 - 90);
  } else if (sharpeRatio100 >= 70) {
    efficiencyScore = 50 + (sharpeRatio100 - 70);
  } else {
    efficiencyScore = Math.max(0, sharpeRatio100 * 0.7);
  }
  
  // Optimization potential score (20% weight) - secondary factor
  let optimizationScore: number;
  if (relativeImprovement < 0.05) optimizationScore = 90;
  else if (relativeImprovement < 0.10) optimizationScore = 70;
  else if (relativeImprovement < 0.20) optimizationScore = 50;
  else optimizationScore = 30;
  
  score = Math.round(efficiencyScore * 0.8 + optimizationScore * 0.2);
  score = Math.max(0, Math.min(100, score));

  const status = getStatus(score, config);

  // Build recommendations
  const recommendations: string[] = [];
  if (feeReduction > 0.005) recommendations.push('Reduce fund expense ratios');
  if (rebalanceImprovement > 0.01) recommendations.push('Rebalance to lower volatility');
  const poorHoldings = holdingEfficiency.filter(h => h.contribution === 'POOR');
  if (poorHoldings.length > 0) recommendations.push(`Replace ${poorHoldings.length} inefficient holding${poorHoldings.length > 1 ? 's' : ''}`);

  // Enhanced key finding
  const perfEducation = "Sharpe ratio measures return per unit of risk – higher is better. Optimization potential shows how much improvement is possible through rebalancing and fee reduction.";
  
  let keyFinding: string;
  if (sharpeRatio >= targetSharpe && relativeImprovement < 0.10) {
    keyFinding = `EXCELLENT: Current Sharpe ${sharpeRatio.toFixed(2)} meets ${targetSharpe.toFixed(2)} target with limited optimization upside (+${formatPct(relativeImprovement, 0)}%). Portfolio is efficiently positioned. ${perfEducation}`;
  } else if (sharpeRatio >= targetSharpe) {
    keyFinding = `Sharpe ${sharpeRatio.toFixed(2)} meets target. Optimization could improve to ${optimizedSharpe.toFixed(2)} (+${formatPct(relativeImprovement, 0)}%) via ${recommendations[0]?.toLowerCase() || 'fine-tuning'}. ${perfEducation}`;
  } else if (sharpeRatio100 < 70) {
    keyFinding = `Sharpe ${sharpeRatio.toFixed(2)} is only ${Math.round(sharpeRatio100)}% of target – risk-adjusted returns are POOR. Potential improvement: +${formatPct(relativeImprovement, 0)}% (${sharpeRatio.toFixed(2)} → ${optimizedSharpe.toFixed(2)}). ${perfEducation}`;
  } else {
    keyFinding = `Sharpe ${sharpeRatio.toFixed(2)} is ${Math.round(sharpeRatio100)}% of ${targetSharpe.toFixed(2)} target. Optimization potential: +${formatPct(relativeImprovement, 0)}% improvement. ${recommendations.length > 0 ? recommendations[0] + '.' : ''} ${perfEducation}`;
  }

  const dataSourceNote = assetClassCount > 0 
    ? `Note: ${tickerDataCount} holdings use ticker-specific estimates; ${assetClassCount} use asset class averages.`
    : undefined;

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Sharpe: ${sharpeRatio.toFixed(2)} (${Math.round(sharpeRatio100)}% of target) | Potential: +${formatPct(relativeImprovement, 0)}%`,
    details: {
      // Return efficiency details
      sharpeRatio,
      targetSharpe,
      pctOfTarget: Math.round(sharpeRatio100),
      expectedReturn,
      volatility,
      holdingEfficiency: holdingEfficiency.slice(0, 15),
      tickerDataCount,
      assetClassCount,
      dataSourceNote,
      // Optimization details
      optimizedSharpe,
      absoluteImprovement,
      relativeImprovement,
      recommendations,
      beforeAfter: {
        current: { expectedReturn, volatility, sharpeRatio, fees: totalFees },
        optimized: { 
          expectedReturn: optimizedReturn, 
          volatility: optimizedVol, 
          sharpeRatio: optimizedSharpe, 
          fees: totalFees * 0.5 
        },
      },
    },
  };
}

// ============================================================================
// 4. COST & FEE ANALYSIS
// ============================================================================
function analyzeCosts(
  holdings: Holding[], 
  totalValue: number, 
  totalFees: number,
  adviceModel: AdviceModel,
  advisorFee: number,
  config: ScoringConfig
): DiagnosticResult {
  const productFees = totalValue > 0 ? totalFees / totalValue : 0;
  const allInFees = productFees + advisorFee;
  const tenYearImpact = totalValue * (1 - Math.pow(1 - allInFees, 10));
  
  const thresholds = config.fees[adviceModel];
  
  const holdingFees = holdings.map(h => ({
    ticker: h.ticker,
    name: h.name,
    value: h.shares * h.currentPrice,
    expenseRatio: h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf,
    annualFee: h.shares * h.currentPrice * (h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf),
  })).sort((a, b) => b.annualFee - a.annualFee);

  let score: number;
  if (allInFees <= thresholds.greenMax) {
    score = 85 + (1 - allInFees / thresholds.greenMax) * 15;
  } else if (allInFees <= thresholds.yellowMax) {
    const range = thresholds.yellowMax - thresholds.greenMax;
    const position = (allInFees - thresholds.greenMax) / range;
    score = 40 + (1 - position) * 30;
  } else {
    score = Math.max(0, 40 - (allInFees - thresholds.yellowMax) * 200);
  }

  const status = getStatus(score, config);

  const modelLabel = adviceModel === 'self-directed' ? 'self-directed' 
    : adviceModel === 'advisor-passive' ? 'passive advisor' : 'tactical advisor';
  
  const feeBreakdown = `Advisor: ${formatPct(advisorFee, 2)}% + Products: ${formatPct(productFees, 2)}% = ${formatPct(allInFees, 2)}% total`;
  const feeEducation = "Fees compound over time – a 1% difference can reduce your portfolio by 20%+ over 20 years.";
  
  let keyFinding: string;
  if (status === 'GREEN') {
    keyFinding = `${feeBreakdown}. Fees are reasonable for ${modelLabel} model. ${feeEducation}`;
  } else if (status === 'YELLOW') {
    keyFinding = `${feeBreakdown}. Fees are elevated for ${modelLabel} (typical max: ${formatPct(thresholds.greenMax, 1)}%). ${feeEducation}`;
  } else {
    keyFinding = `${feeBreakdown}. Fees are HIGH for ${modelLabel} (above ${formatPct(thresholds.yellowMax, 1)}% typical). ${feeEducation}`;
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Total: ${formatPct(allInFees, 2)}% (Advisor ${formatPct(advisorFee, 2)}% + Products ${formatPct(productFees, 2)}%)`,
    details: {
      productFees,
      advisorFee,
      allInFees,
      tenYearImpact,
      holdingFees,
      adviceModel,
      thresholds,
      modelLabel,
    },
  };
}

// ============================================================================
// 5. TAX EFFICIENCY
// ============================================================================
function analyzeTaxEfficiency(
  holdings: Holding[], 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
  const taxableHoldings = holdings.filter(h => h.accountType === 'Taxable');
  
  const lossCandidates = taxableHoldings.filter(h => h.currentPrice < h.costBasis);
  const totalHarvestable = lossCandidates.reduce((sum, h) => 
    sum + h.shares * (h.costBasis - h.currentPrice), 0
  );
  const estimatedTaxSavings = totalHarvestable * 0.25;

  const inefficientInTaxable = taxableHoldings.filter(h => 
    h.assetClass === 'Bonds' || h.assetClass === 'Commodities'
  );

  let score = 80;
  if (totalHarvestable > totalValue * 0.03) score += 10;
  if (inefficientInTaxable.length > 0) score -= 30;

  const status = getStatus(score, config);

  let keyFinding: string;
  if (totalHarvestable > 0) {
    keyFinding = `$${totalHarvestable.toLocaleString(undefined, { maximumFractionDigits: 0 })} in unrealized losses in TAXABLE accounts could be harvested for ~$${estimatedTaxSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} tax savings`;
  } else if (inefficientInTaxable.length > 0) {
    keyFinding = `${inefficientInTaxable.length} tax-inefficient holdings (bonds/commodities) are in taxable accounts – consider moving to tax-advantaged`;
  } else if (status === 'GREEN') {
    keyFinding = 'Tax positioning is efficient – tax-inefficient assets properly placed';
  } else {
    keyFinding = 'Review asset location for potential tax optimization';
  }

  const allHoldingsWithGainLoss = holdings.map(h => {
    const value = h.shares * h.currentPrice;
    const costValue = h.shares * h.costBasis;
    const gainLoss = value - costValue;
    const isTaxable = h.accountType === 'Taxable';
    const hasLoss = gainLoss < 0;
    
    return {
      ticker: h.ticker,
      name: h.name,
      accountType: h.accountType,
      value,
      costValue,
      gainLoss,
      gainLossPct: costValue > 0 ? (gainLoss / costValue) * 100 : 0,
      harvestable: isTaxable && hasLoss,
    };
  }).sort((a, b) => a.gainLoss - b.gainLoss);

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Harvestable losses (taxable only): $${totalHarvestable.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    details: {
      lossCandidates: lossCandidates.map(h => ({
        ticker: h.ticker,
        accountType: h.accountType,
        unrealizedLoss: h.shares * (h.costBasis - h.currentPrice),
        harvestable: h.accountType === 'Taxable',
      })),
      allHoldings: allHoldingsWithGainLoss,
      totalHarvestable,
      estimatedTaxSavings,
      inefficientInTaxable,
      taxableHoldingsCount: taxableHoldings.length,
      totalHoldingsCount: holdings.length,
    },
  };
}

// ============================================================================
// 6. RISK-ADJUSTED PERFORMANCE (GOAL PROBABILITY)
// ============================================================================
interface LifetimeIncomeAnalysisData {
  coreCoveragePct: number;
  discretionaryMonthly: number;
  healthcareMonthly: number;
  guaranteedIncomeMonthly: number;
}

function analyzeRiskAdjusted(
  holdings: Holding[], 
  clientInfo: ClientInfo, 
  totalValue: number, 
  expectedReturn: number, 
  volatility: number,
  config: ScoringConfig,
  lifetimeIncomeData?: LifetimeIncomeAnalysisData
): DiagnosticResult {
  const sortinoRatio = volatility > 0 ? (expectedReturn - RISK_FREE_RATE) / (volatility * 0.7) : 0;
  const maxDrawdown = volatility * 2.5;
  
  const coreSecured = lifetimeIncomeData && lifetimeIncomeData.coreCoveragePct >= 1.0;
  const partiallyCovered = lifetimeIncomeData && lifetimeIncomeData.coreCoveragePct >= 0.5 && lifetimeIncomeData.coreCoveragePct < 1.0;
  
  let probability = 50;
  if (clientInfo.targetAmount && clientInfo.yearsToGoal && totalValue > 0) {
    const requiredReturn = Math.pow(clientInfo.targetAmount / totalValue, 1 / clientInfo.yearsToGoal) - 1;
    const zScore = (expectedReturn - requiredReturn) / volatility;
    probability = Math.min(95, Math.max(5, 50 + zScore * 30));
  }

  let score: number;
  if (probability >= config.goalProbability.greenMin) {
    score = 70 + ((probability - config.goalProbability.greenMin) / 25) * 30;
  } else if (probability >= config.goalProbability.yellowMin) {
    const range = config.goalProbability.greenMin - config.goalProbability.yellowMin;
    score = 40 + ((probability - config.goalProbability.yellowMin) / range) * 30;
  } else {
    score = (probability / config.goalProbability.yellowMin) * 40;
  }
  score = Math.min(100, Math.max(0, score));

  if (coreSecured) {
    score = Math.min(100, score + 15);
  } else if (partiallyCovered) {
    score = Math.min(100, score + 5);
  }

  if (maxDrawdown > 0.4) score -= 20;
  score = Math.max(0, score);

  const status = getStatus(score, config);

  let bandLabel: string;
  if (probability >= config.goalProbability.greenMin) bandLabel = 'Comfortable';
  else if (probability >= config.goalProbability.yellowMin) bandLabel = 'Borderline';
  else bandLabel = 'At Risk';

  const goalEducation = "This probability is based on Monte Carlo-style analysis using your current allocation, expected returns, and time horizon. Below 75% typically requires adjustments.";
  
  let keyFinding: string;
  let goalType: 'full' | 'discretionary-only' = 'full';
  let incomeSecurityNote: string | undefined;

  if (coreSecured) {
    goalType = 'discretionary-only';
    keyFinding = `EXCELLENT: Essential expenses are secured by lifetime income. ${probability.toFixed(0)}% probability for discretionary & legacy goals. Since your basic needs are guaranteed, you can afford more investment risk for growth. ${goalEducation}`;
    incomeSecurityNote = 'Your basic lifestyle is guaranteed regardless of market performance';
  } else if (partiallyCovered && lifetimeIncomeData) {
    const monthlyGap = (1 - lifetimeIncomeData.coreCoveragePct) * (lifetimeIncomeData.discretionaryMonthly + lifetimeIncomeData.healthcareMonthly + lifetimeIncomeData.guaranteedIncomeMonthly / lifetimeIncomeData.coreCoveragePct);
    incomeSecurityNote = `Portfolio must generate ~$${Math.round(monthlyGap).toLocaleString()}/mo to cover remaining core expenses`;
    if (probability >= config.goalProbability.greenMin) {
      keyFinding = `${probability.toFixed(0)}% probability of reaching goal – comfortable margin. ${goalEducation}`;
    } else if (probability >= config.goalProbability.yellowMin) {
      keyFinding = `${probability.toFixed(0)}% probability is BORDERLINE – consider increasing savings, reducing goal, or extending timeline. ${goalEducation}`;
    } else {
      keyFinding = `${probability.toFixed(0)}% probability is LOW – plan changes likely needed. Consider guaranteed income to secure essentials. ${goalEducation}`;
    }
  } else {
    incomeSecurityNote = lifetimeIncomeData && lifetimeIncomeData.coreCoveragePct > 0 
      ? 'Full lifestyle risk depends on portfolio performance'
      : undefined;
    if (probability >= config.goalProbability.greenMin) {
      keyFinding = `${probability.toFixed(0)}% probability of reaching goal – comfortable margin. ${goalEducation}`;
    } else if (probability >= config.goalProbability.yellowMin) {
      keyFinding = `${probability.toFixed(0)}% probability is BORDERLINE – consider increasing savings, reducing goal, or extending timeline. ${goalEducation}`;
    } else {
      keyFinding = `${probability.toFixed(0)}% probability is LOW – plan changes likely needed. Your entire lifestyle depends on portfolio performance. ${goalEducation}`;
    }
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: coreSecured 
      ? `Discretionary goal: ${probability.toFixed(0)}% (Core Secured)`
      : `Goal probability: ${probability.toFixed(0)}% (${bandLabel})`,
    details: { 
      sortinoRatio, 
      maxDrawdown, 
      probability, 
      bandLabel,
      greenMin: config.goalProbability.greenMin,
      yellowMin: config.goalProbability.yellowMin,
      incomeSecured: coreSecured,
      goalType,
      incomeSecurityNote,
      coreCoveragePct: lifetimeIncomeData?.coreCoveragePct,
    },
  };
}

// ============================================================================
// 7. PLANNING GAPS
// ============================================================================
function analyzePlanningGaps(
  checklist: PlanningChecklist,
  config: ScoringConfig
): DiagnosticResult {
  const checklistItems = {
    willTrust: { name: 'Will/Trust', critical: true },
    healthcareDirectives: { name: 'Healthcare Directives', critical: true },
    poaDirectives: { name: 'Power of Attorney', critical: true },
    emergencyFund: { name: 'Emergency Fund', critical: true },
    beneficiaryReview: { name: 'Beneficiary Review', critical: false },
    executorDesignation: { name: 'Executor Designation', critical: false },
    guardianDesignation: { name: 'Guardian Designation', critical: false },
    insuranceCoverage: { name: 'Insurance Review', critical: false },
    digitalAssetPlan: { name: 'Digital Asset Plan', critical: false },
    withdrawalStrategy: { name: 'Withdrawal Strategy', critical: false },
    investmentPolicyStatement: { name: 'Investment Policy Statement', critical: false },
  };

  const items = Object.entries(checklist) as [keyof PlanningChecklist, boolean][];
  const completed = items.filter(([_, v]) => v).length;
  const total = items.length;
  
  const missingItems = items
    .filter(([_, v]) => !v)
    .map(([k]) => checklistItems[k]?.name || k);
  
  const criticalMissing = items
    .filter(([k, v]) => !v && config.planningGaps.criticalItems.includes(k))
    .map(([k]) => checklistItems[k]?.name || k);

  let score: number;
  if (completed >= config.planningGaps.greenMinComplete) {
    score = 70 + ((completed - config.planningGaps.greenMinComplete) / (total - config.planningGaps.greenMinComplete)) * 30;
  } else if (completed >= config.planningGaps.yellowMinComplete) {
    const range = config.planningGaps.greenMinComplete - config.planningGaps.yellowMinComplete;
    score = 40 + ((completed - config.planningGaps.yellowMinComplete) / range) * 30;
  } else {
    score = (completed / config.planningGaps.yellowMinComplete) * 40;
  }

  score -= criticalMissing.length * 15;
  score = Math.max(0, score);

  const status = getStatus(score, config);

  let keyFinding: string;
  if (completed === total) {
    keyFinding = 'Financial plan is comprehensive – all planning items complete';
  } else if (criticalMissing.length > 0) {
    keyFinding = `Critical gaps: ${criticalMissing.slice(0, 2).join(', ')}${criticalMissing.length > 2 ? ` (+${criticalMissing.length - 2} more)` : ''}`;
  } else if (status === 'GREEN') {
    keyFinding = `Most planning items complete – ${missingItems.length} minor item${missingItems.length > 1 ? 's' : ''} remaining`;
  } else {
    keyFinding = `Planning gaps remain: ${missingItems.slice(0, 2).join(', ')}`;
  }

  return {
    status,
    score: Math.max(0, score),
    keyFinding,
    headlineMetric: `Planning items: ${completed}/${total} complete`,
    details: { 
      checklist, 
      completed, 
      total, 
      completionRate: completed / total,
      missingItems,
      criticalMissing,
      checklistItems,
    },
  };
}

// ============================================================================
// 8. LIFETIME INCOME SECURITY
// ============================================================================
const DEFAULT_LIFETIME_INCOME_INPUTS: LifetimeIncomeInputs = {
  coreLivingExpensesMonthly: 0,
  discretionaryExpensesMonthly: 0,
  healthcareLongTermCareMonthly: 0,
  guaranteedSources: [],
};

function analyzeLifetimeIncomeSecurity(
  inputs: LifetimeIncomeInputs = DEFAULT_LIFETIME_INCOME_INPUTS,
  config: ScoringConfig
): DiagnosticResult {
  const { coreLivingExpensesMonthly, discretionaryExpensesMonthly, healthcareLongTermCareMonthly, guaranteedSources } = inputs;
  
  const totalExpenses = coreLivingExpensesMonthly + discretionaryExpensesMonthly + healthcareLongTermCareMonthly;
  
  const guaranteedIncome = guaranteedSources
    .filter(s => s.guaranteedForLife)
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
  
  if (coreLivingExpensesMonthly === 0 && guaranteedSources.length === 0) {
    return {
      status: 'YELLOW',
      score: 50,
      keyFinding: 'Use the "Lifetime Income & Expenses" panel (right sidebar, scroll down) to enter your monthly living expenses and guaranteed income sources (Social Security, pensions, annuities). This analysis shows how much of your lifestyle is protected from market risk.',
      headlineMetric: 'Enter expenses in sidebar →',
      details: {
        coreExpensesMonthly: 0,
        discretionaryMonthly: 0,
        healthcareMonthly: 0,
        totalExpensesMonthly: 0,
        guaranteedLifetimeIncomeMonthly: 0,
        coreCoveragePct: 0,
        totalCoveragePct: 0,
        shortfallCoreMonthly: 0,
        surplusForLifestyleMonthly: 0,
        sources: [],
        needsDataEntry: true,
      },
    };
  }
  
  const coreCoverage = coreLivingExpensesMonthly > 0 
    ? guaranteedIncome / coreLivingExpensesMonthly 
    : 0;
  const totalCoverage = totalExpenses > 0 
    ? guaranteedIncome / totalExpenses 
    : 0;
  
  const shortfall = Math.max(0, coreLivingExpensesMonthly - guaranteedIncome);
  const surplus = Math.max(0, guaranteedIncome - coreLivingExpensesMonthly);
  
  let score: number;
  if (coreCoverage >= config.lifetimeIncomeSecurity.coreCoverageGreen) {
    score = 85 + Math.min(15, (coreCoverage - 1.0) * 30);
  } else if (coreCoverage >= config.lifetimeIncomeSecurity.coreCoverageYellow) {
    const range = config.lifetimeIncomeSecurity.coreCoverageGreen - config.lifetimeIncomeSecurity.coreCoverageYellow;
    score = 40 + ((coreCoverage - config.lifetimeIncomeSecurity.coreCoverageYellow) / range) * 45;
  } else {
    score = (coreCoverage / config.lifetimeIncomeSecurity.coreCoverageYellow) * 40;
  }
  
  const status = getStatus(Math.min(100, Math.max(0, score)), config);
  
  const incomeEducation = "Lifetime Income Security measures how much of your essential expenses are covered by income you can't outlive (Social Security, pensions, annuities). 100%+ coverage means market volatility can't threaten your basic lifestyle.";
  
  let keyFinding: string;
  if (coreCoverage >= 1.0) {
    const surplusPct = ((coreCoverage - 1) * 100).toFixed(0);
    keyFinding = `EXCELLENT: Guaranteed income ($${guaranteedIncome.toLocaleString()}/mo) fully covers core expenses ($${coreLivingExpensesMonthly.toLocaleString()}/mo) with ${surplusPct}% surplus. Your essential lifestyle is bulletproof – market crashes cannot threaten your basic needs. ${incomeEducation}`;
  } else if (coreCoverage >= 0.8) {
    const gap = coreLivingExpensesMonthly - guaranteedIncome;
    keyFinding = `Guaranteed income covers ${(coreCoverage * 100).toFixed(0)}% of core expenses. The remaining $${gap.toLocaleString()}/mo gap depends on portfolio performance. Consider additional guaranteed income to fully secure essentials. ${incomeEducation}`;
  } else if (coreCoverage > 0) {
    const gap = coreLivingExpensesMonthly - guaranteedIncome;
    keyFinding = `WARNING: Guaranteed income covers only ${(coreCoverage * 100).toFixed(0)}% of core expenses. A $${gap.toLocaleString()}/mo shortfall must come from portfolio withdrawals, exposing your basic lifestyle to market risk. ${incomeEducation}`;
  } else {
    keyFinding = `CRITICAL: No guaranteed lifetime income identified. Your entire lifestyle depends on portfolio performance and market conditions. Consider Social Security optimization and/or annuities. ${incomeEducation}`;
  }
  
  return {
    status,
    score: Math.min(100, Math.max(0, score)),
    keyFinding,
    headlineMetric: `Core covered: ${(coreCoverage * 100).toFixed(0)}% ($${guaranteedIncome.toLocaleString()}/mo vs $${coreLivingExpensesMonthly.toLocaleString()}/mo)`,
    details: {
      coreExpensesMonthly: coreLivingExpensesMonthly,
      discretionaryMonthly: discretionaryExpensesMonthly,
      healthcareMonthly: healthcareLongTermCareMonthly,
      totalExpensesMonthly: totalExpenses,
      guaranteedLifetimeIncomeMonthly: guaranteedIncome,
      coreCoveragePct: coreCoverage,
      totalCoveragePct: totalCoverage,
      shortfallCoreMonthly: shortfall,
      surplusForLifestyleMonthly: surplus,
      sources: guaranteedSources,
    },
  };
}

// ============================================================================
// GENERATE RECOMMENDATIONS
// ============================================================================
function generateRecommendations(analysis: Omit<PortfolioAnalysis, 'recommendations'>): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let priority = 1;

  const { diagnostics } = analysis;

  if (diagnostics.riskDiversification.status === 'RED') {
    const details = diagnostics.riskDiversification.details as { maxSinglePositionPct: number };
    recommendations.push({
      id: `rec-${priority}`,
      category: 'riskDiversification',
      priority: priority++,
      title: 'Reduce concentration risk',
      description: `Portfolio has concentration or diversification issues`,
      impact: 'Better risk distribution and stability',
    });
  }

  if (diagnostics.costAnalysis.status === 'RED' || diagnostics.costAnalysis.status === 'YELLOW') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'costAnalysis',
      priority: priority++,
      title: 'Review fee structure',
      description: 'Total fees may be elevated for your advice model',
      impact: `Potential savings of $${((analysis.totalFees * 0.3)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/year`,
    });
  }

  const harvestable = diagnostics.taxEfficiency.details.totalHarvestable as number;
  if (harvestable > 0) {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'taxEfficiency',
      priority: priority++,
      title: 'Harvest tax losses',
      description: 'Realize losses in taxable accounts to offset gains',
      impact: `Potential $${(diagnostics.taxEfficiency.details.estimatedTaxSavings as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} tax savings`,
    });
  }

  if (diagnostics.performanceOptimization.status !== 'GREEN') {
    const details = diagnostics.performanceOptimization.details as { targetSharpe: number };
    recommendations.push({
      id: `rec-${priority}`,
      category: 'performanceOptimization',
      priority: priority++,
      title: 'Improve return efficiency',
      description: `Optimize portfolio toward Sharpe target of ${(details.targetSharpe || 0.5).toFixed(2)}`,
      impact: 'Better risk-adjusted returns',
    });
  }

  if (diagnostics.downsideResilience.status === 'RED') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'downsideResilience',
      priority: priority++,
      title: 'Address vulnerability gaps',
      description: 'Portfolio has significant downside risk exposure',
      impact: 'Better protection against market stress',
    });
  }

  if (diagnostics.planningGaps.status !== 'GREEN') {
    const details = diagnostics.planningGaps.details as { criticalMissing: string[] };
    if (details.criticalMissing?.length > 0) {
      recommendations.push({
        id: `rec-${priority}`,
        category: 'planningGaps',
        priority: priority++,
        title: 'Complete critical planning items',
        description: `Missing: ${details.criticalMissing.slice(0, 2).join(', ')}`,
        impact: 'Comprehensive financial protection',
      });
    }
  }

  if (diagnostics.lifetimeIncomeSecurity.status === 'RED') {
    const details = diagnostics.lifetimeIncomeSecurity.details as { coreCoveragePct: number };
    recommendations.push({
      id: `rec-${priority}`,
      category: 'lifetimeIncomeSecurity',
      priority: priority++,
      title: 'Secure guaranteed lifetime income',
      description: `Only ${((details.coreCoveragePct || 0) * 100).toFixed(0)}% of core expenses covered by guarantees`,
      impact: 'Eliminate dependence on market returns for basic needs',
    });
  }

  return recommendations.slice(0, 5);
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================
export function analyzePortfolio(
  holdings: Holding[],
  clientInfo: ClientInfo,
  planningChecklist: PlanningChecklist,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  adviceModel: AdviceModel = 'self-directed',
  advisorFee: number = 0,
  lifetimeIncomeInputs: LifetimeIncomeInputs = DEFAULT_LIFETIME_INCOME_INPUTS
): PortfolioAnalysis {
  const metrics = calculatePortfolioMetrics(holdings);
  
  if (holdings.length === 0) {
    const emptyResult: DiagnosticResult = {
      status: 'YELLOW',
      score: 50,
      keyFinding: 'Add holdings to begin analysis',
      headlineMetric: 'No data',
      details: {},
    };
    
    return {
      healthScore: 0,
      ...metrics,
      diagnostics: {
        riskDiversification: emptyResult,
        downsideResilience: emptyResult,
        performanceOptimization: emptyResult,
        costAnalysis: emptyResult,
        taxEfficiency: emptyResult,
        riskAdjusted: emptyResult,
        planningGaps: analyzePlanningGaps(planningChecklist, config),
        lifetimeIncomeSecurity: analyzeLifetimeIncomeSecurity(lifetimeIncomeInputs, config),
      },
      recommendations: [],
    };
  }

  // Calculate lifetime income data for goal analysis integration
  const lifetimeIncomeResult = analyzeLifetimeIncomeSecurity(lifetimeIncomeInputs, config);
  const lifetimeIncomeAnalysisData: LifetimeIncomeAnalysisData | undefined = 
    lifetimeIncomeInputs.coreLivingExpensesMonthly > 0 || lifetimeIncomeInputs.guaranteedSources.length > 0
      ? {
          coreCoveragePct: (lifetimeIncomeResult.details.coreCoveragePct as number) || 0,
          discretionaryMonthly: lifetimeIncomeInputs.discretionaryExpensesMonthly,
          healthcareMonthly: lifetimeIncomeInputs.healthcareLongTermCareMonthly,
          guaranteedIncomeMonthly: (lifetimeIncomeResult.details.guaranteedLifetimeIncomeMonthly as number) || 0,
        }
      : undefined;

  const diagnostics = {
    riskDiversification: analyzeRiskAndDiversification(holdings, clientInfo, metrics.totalValue, metrics.volatility, config),
    downsideResilience: analyzeDownsideResilience(holdings, metrics.totalValue, config),
    performanceOptimization: analyzePerformanceAndOptimization(holdings, metrics.totalValue, metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio, metrics.totalFees, config),
    costAnalysis: analyzeCosts(holdings, metrics.totalValue, metrics.totalFees, adviceModel, advisorFee, config),
    taxEfficiency: analyzeTaxEfficiency(holdings, metrics.totalValue, config),
    riskAdjusted: analyzeRiskAdjusted(holdings, clientInfo, metrics.totalValue, metrics.expectedReturn, metrics.volatility, config, lifetimeIncomeAnalysisData),
    planningGaps: analyzePlanningGaps(planningChecklist, config),
    lifetimeIncomeSecurity: lifetimeIncomeResult,
  };

  // Calculate overall health score (weighted average of diagnostics)
  const weights = {
    riskDiversification: 0.18,
    downsideResilience: 0.15,
    performanceOptimization: 0.15,
    costAnalysis: 0.12,
    taxEfficiency: 0.08,
    riskAdjusted: 0.12,
    planningGaps: 0.10,
    lifetimeIncomeSecurity: 0.10,
  };

  const healthScore = Object.entries(diagnostics).reduce((sum, [key, result]) => {
    const weight = weights[key as keyof typeof weights] || 0.1;
    return sum + result.score * weight;
  }, 0);

  const analysisWithoutRecs: Omit<PortfolioAnalysis, 'recommendations'> = {
    healthScore: Math.round(healthScore),
    ...metrics,
    diagnostics,
  };

  return {
    ...analysisWithoutRecs,
    recommendations: generateRecommendations(analysisWithoutRecs),
  };
}
