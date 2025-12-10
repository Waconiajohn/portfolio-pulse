import {
  Holding,
  ClientInfo,
  PortfolioAnalysis,
  DiagnosticResult,
  DiagnosticStatus,
  Recommendation,
  PlanningChecklist,
  AssetClass,
} from '@/types/portfolio';
import {
  EXPECTED_RETURNS,
  VOLATILITY,
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
// 1. RISK MANAGEMENT
// ============================================================================
function analyzeRiskManagement(
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

  // Scoring
  let score = 100;
  if (riskGap > config.riskManagement.riskGapSevereThreshold) score -= 40;
  else if (riskGap > config.riskManagement.riskGapWarningThreshold) score -= 20;
  if (hasConcentration) score -= 25;
  if (hasSectorConcentration) score -= 15;

  const status = getStatus(score, config);

  // Build key finding - must be consistent with status
  let keyFinding: string;
  if (hasConcentration) {
    keyFinding = `Top position (${positions[0]?.ticker}) is ${formatPct(topPosition)}% of portfolio, WELL ABOVE the ${formatPct(maxPosPct, 0)}% concentration guideline`;
  } else if (hasSectorConcentration) {
    keyFinding = `Top sector concentration is ${formatPct(topSector)}%, exceeding ${formatPct(config.riskManagement.maxSectorPct, 0)}% guideline`;
  } else if (riskGap > config.riskManagement.riskGapSevereThreshold) {
    const direction = volatility > targetVol ? 'higher' : 'lower';
    keyFinding = `Portfolio volatility is significantly ${direction} than your ${clientInfo.riskTolerance} target`;
  } else if (status === 'GREEN') {
    keyFinding = 'Portfolio risk is well-aligned with your stated risk tolerance';
  } else {
    keyFinding = 'Some risk management adjustments may improve portfolio stability';
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Largest Position: ${formatPct(topPosition)}% (Max ${formatPct(maxPosPct, 0)}%)`,
    details: {
      currentVolatility: volatility,
      targetVolatility: targetVol,
      riskGap,
      topPositions: positions.slice(0, 5),
      sectorWeights,
      hasConcentration,
      hasSectorConcentration,
      maxSinglePositionPct: maxPosPct,
      maxSectorPct: config.riskManagement.maxSectorPct,
    },
  };
}

// ============================================================================
// 2. RETURN EFFICIENCY (SHARPE)
// ============================================================================
function analyzeReturnEfficiency(
  holdings: Holding[], 
  totalValue: number, 
  expectedReturn: number, 
  volatility: number, 
  sharpeRatio: number,
  config: ScoringConfig
): DiagnosticResult {
  const targetSharpe = config.sharpe.portfolioTarget;
  const sharpeGap = sharpeRatio - targetSharpe;
  const sharpeRatio100 = targetSharpe > 0 ? (sharpeRatio / targetSharpe) * 100 : 0;
  
  // Use proportional thresholds based on target
  // GOOD: >= 90% of target
  // BELOW TARGET: 70-90% of target  
  // POOR: < 70% of target
  const goodPctThreshold = 0.90;  // Must be at least 90% of target to be "Good"
  const belowTargetPctThreshold = 0.70;  // Between 70-90% = "Below Target", <70% = "Poor"

  const holdingEfficiency = holdings.map(h => {
    const value = h.shares * h.currentPrice;
    const weight = value / totalValue;
    const assetReturn = EXPECTED_RETURNS[h.assetClass] || 0.06;
    const assetVol = VOLATILITY[h.assetClass] || 0.12;
    const holdingSharpe = assetVol > 0 ? (assetReturn - RISK_FREE_RATE) / assetVol : 0;
    
    // Proportional labeling based on how close to target
    const pctOfTarget = targetSharpe > 0 ? holdingSharpe / targetSharpe : 0;
    let contribution: 'GOOD' | 'BELOW TARGET' | 'POOR';
    if (pctOfTarget >= goodPctThreshold) contribution = 'GOOD';
    else if (pctOfTarget >= belowTargetPctThreshold) contribution = 'BELOW TARGET';
    else contribution = 'POOR';

    return { 
      ticker: h.ticker, 
      sharpe: holdingSharpe, 
      contribution, 
      weight,
      pctOfTarget: Math.round(pctOfTarget * 100),
    };
  });

  // Scoring based on percentage of target achieved
  let score: number;
  if (sharpeRatio >= targetSharpe) {
    score = 85 + Math.min(15, (sharpeRatio - targetSharpe) * 30);
  } else {
    score = Math.max(0, sharpeRatio100 * 0.85);
  }
  score = Math.max(0, Math.min(100, score));

  const status = getStatus(score, config);

  // Consistent key finding with percentage context
  let keyFinding: string;
  if (sharpeRatio >= targetSharpe) {
    keyFinding = `Portfolio Sharpe ratio ${sharpeRatio.toFixed(2)} meets or exceeds ${targetSharpe.toFixed(2)} target`;
  } else if (sharpeRatio100 < 70) {
    keyFinding = `Portfolio Sharpe ratio ${sharpeRatio.toFixed(2)} is only ${Math.round(sharpeRatio100)}% of ${targetSharpe.toFixed(2)} target – POOR risk-adjusted returns`;
  } else {
    keyFinding = `Portfolio Sharpe ratio ${sharpeRatio.toFixed(2)} is ${Math.round(sharpeRatio100)}% of ${targetSharpe.toFixed(2)} target – below optimal`;
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Sharpe: ${sharpeRatio.toFixed(2)} (${Math.round(sharpeRatio100)}% of ${targetSharpe.toFixed(2)} target)`,
    details: {
      sharpeRatio,
      targetSharpe,
      pctOfTarget: Math.round(sharpeRatio100),
      expectedReturn,
      volatility,
      holdingEfficiency: holdingEfficiency.slice(0, 10),
      goodPctThreshold: Math.round(goodPctThreshold * 100),
      belowTargetPctThreshold: Math.round(belowTargetPctThreshold * 100),
    },
  };
}

// ============================================================================
// 3. COST & FEE ANALYSIS
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
    value: h.shares * h.currentPrice,
    expenseRatio: h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf,
    annualFee: h.shares * h.currentPrice * (h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf),
  })).sort((a, b) => b.annualFee - a.annualFee);

  // Scoring based on advice model thresholds
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

  // Consistent key finding based on model
  const modelLabel = adviceModel === 'self-directed' ? 'self-directed' 
    : adviceModel === 'advisor-passive' ? 'passive advisor' : 'tactical advisor';
  
  let keyFinding: string;
  if (status === 'GREEN') {
    keyFinding = `Total fees ${formatPct(allInFees, 2)}% are reasonable for a ${modelLabel} relationship`;
  } else if (status === 'YELLOW') {
    keyFinding = `Total fees ${formatPct(allInFees, 2)}% are elevated for a ${modelLabel} relationship (typical: ${formatPct(thresholds.greenMax, 2)}-${formatPct(thresholds.yellowMax, 2)}%)`;
  } else {
    keyFinding = `Total fees ${formatPct(allInFees, 2)}% are HIGH for a ${modelLabel} relationship (above typical ${formatPct(thresholds.yellowMax, 2)}% range)`;
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Total all-in fees: ${formatPct(allInFees, 2)}% (${ADVICE_MODEL_LABELS[adviceModel]})`,
    details: {
      productFees,
      advisorFee,
      allInFees,
      tenYearImpact,
      holdingFees,
      adviceModel,
      thresholds,
    },
  };
}

// Need to import this for the label
import { ADVICE_MODEL_LABELS } from './scoring-config';

// ============================================================================
// 4. TAX EFFICIENCY
// ============================================================================
function analyzeTaxEfficiency(
  holdings: Holding[], 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
  const taxableHoldings = holdings.filter(h => h.accountType === 'Taxable');
  
  // Loss harvesting candidates - TAXABLE ACCOUNTS ONLY
  const lossCandidates = taxableHoldings.filter(h => h.currentPrice < h.costBasis);
  const totalHarvestable = lossCandidates.reduce((sum, h) => 
    sum + h.shares * (h.costBasis - h.currentPrice), 0
  );
  const estimatedTaxSavings = totalHarvestable * 0.25;

  // Tax-inefficient assets in taxable accounts
  const inefficientInTaxable = taxableHoldings.filter(h => 
    h.assetClass === 'Bonds' || h.assetClass === 'Commodities'
  );

  let score = 80;
  if (totalHarvestable > totalValue * 0.03) score += 10;
  if (inefficientInTaxable.length > 0) score -= 30;

  const status = getStatus(score, config);

  // Consistent key finding - emphasize TAXABLE accounts only
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
      totalHarvestable,
      estimatedTaxSavings,
      inefficientInTaxable,
      taxableHoldingsCount: taxableHoldings.length,
    },
  };
}

// ============================================================================
// 5. DIVERSIFICATION
// ============================================================================
function analyzeDiversification(
  holdings: Holding[], 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
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
  const sortedByWeight = holdings
    .map(h => ({ ticker: h.ticker, weight: (h.shares * h.currentPrice) / totalValue }))
    .sort((a, b) => b.weight - a.weight);
  const top3Weight = sortedByWeight.slice(0, 3).reduce((sum, h) => sum + h.weight, 0);
  const top10Weight = sortedByWeight.slice(0, 10).reduce((sum, h) => sum + h.weight, 0);

  // Scoring
  let score = 70;
  const tooFewHoldings = numHoldings < minHoldings;
  const tooManyHoldings = numHoldings > maxHoldings;
  const top10TooConcentrated = top10Weight > config.diversification.top10ConcentrationMax;
  const top3TooConcentrated = top3Weight > config.diversification.top3ConcentrationMax;

  if (tooFewHoldings) score -= 30;
  else if (tooManyHoldings) score -= 10;
  if (top10TooConcentrated) score -= 20;
  if (top3TooConcentrated) score -= 15;
  if (assetClassWeights['Bonds'] < 0.1 && assetClassWeights['US Stocks'] > 0.7) score -= 15;

  const status = getStatus(score, config);

  // Label
  let label: string;
  if (tooFewHoldings) label = 'TOO FEW';
  else if (tooManyHoldings) label = 'TOO MANY';
  else label = 'ADEQUATE';

  // Consistent key finding
  let keyFinding: string;
  if (top3TooConcentrated) {
    keyFinding = `${numHoldings} holdings is ${label.toLowerCase()}, but top 3 positions = ${formatPct(top3Weight, 0)}% – TOO concentrated`;
  } else if (top10TooConcentrated) {
    keyFinding = `Top 10 holdings = ${formatPct(top10Weight, 0)}% of portfolio, exceeding ${formatPct(config.diversification.top10ConcentrationMax, 0)}% target`;
  } else if (tooFewHoldings) {
    keyFinding = `Only ${numHoldings} holdings – consider adding positions for better diversification`;
  } else if (status === 'GREEN') {
    keyFinding = `${numHoldings} holdings across ${Object.values(assetClassWeights).filter(w => w > 0).length} asset classes – well diversified`;
  } else {
    keyFinding = 'Diversification could be improved through broader asset class exposure';
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Top 10: ${formatPct(top10Weight, 0)}% (Target <${formatPct(config.diversification.top10ConcentrationMax, 0)}%)`,
    details: {
      numHoldings,
      assetClassWeights,
      top3: sortedByWeight.slice(0, 3),
      top10: sortedByWeight.slice(0, 10),
      top3Weight,
      top10Weight,
      holdingCountLabel: label,
      minHoldings,
      maxHoldings,
      isLargePortfolio,
    },
  };
}

// ============================================================================
// 6. PROTECTION & VULNERABILITY
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

function analyzeProtection(
  holdings: Holding[], 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
  if (totalValue === 0) {
    return {
      status: 'YELLOW',
      score: 50,
      keyFinding: 'No holdings to analyze for protection',
      headlineMetric: 'N/A',
      details: { riskDetails: [], stockWeight: 0, bondWeight: 0 },
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

  // Calculate detailed risk scores with context
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
      description: 'Risk that inflation erodes purchasing power of your portfolio',
      mitigation: 'Consider TIPS, commodities, real estate, or I-Bonds',
    },
    {
      name: 'interestRateRisk',
      label: 'Interest Rate Risk',
      score: Math.round(bondWeight * 8 + (bondWeight > 0.4 ? 2 : 0)),
      maxScore: 10,
      severity: 'LOW',
      description: 'Risk that rising rates reduce bond values',
      mitigation: 'Shorten bond duration or diversify into short-term bonds',
    },
    {
      name: 'marketCrashRisk',
      label: 'Market Crash Risk',
      score: Math.round(stockWeight * 10),
      maxScore: 10,
      severity: 'LOW',
      description: 'Risk of significant loss during equity market downturns',
      mitigation: 'Add defensive assets, bonds, or reduce equity concentration',
    },
    {
      name: 'liquidityRisk',
      label: 'Liquidity Risk',
      score: Math.round(Math.max(1, 5 - (cashWeight * 20))),
      maxScore: 10,
      severity: 'LOW',
      description: 'Risk of being unable to access funds when needed',
      mitigation: 'Maintain emergency fund and adequate cash reserves',
    },
    {
      name: 'concentrationRisk',
      label: 'Geographic Concentration',
      score: Math.round((1 - intlWeight) * 6),
      maxScore: 10,
      severity: 'LOW',
      description: 'Risk from over-reliance on a single market (e.g., US only)',
      mitigation: 'Add international diversification',
    },
    {
      name: 'sequenceRisk',
      label: 'Sequence of Returns Risk',
      score: Math.round(stockWeight > 0.7 ? 7 : stockWeight > 0.5 ? 5 : 3),
      maxScore: 10,
      severity: 'LOW',
      description: 'Risk that poor returns early in retirement deplete your portfolio',
      mitigation: 'Consider bucket strategy or bond tent near retirement',
    },
  ];

  // Update severity based on calculated scores
  riskDetails.forEach(risk => {
    risk.severity = getSeverity(risk.score);
  });

  const criticalRisks = riskDetails.filter(r => r.severity === 'CRITICAL');
  const highRisks = riskDetails.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL');
  const moderateRisks = riskDetails.filter(r => r.severity === 'MODERATE');

  // Scoring based on risk distribution
  let score = 100;
  score -= criticalRisks.length * 25;
  score -= highRisks.filter(r => r.severity === 'HIGH').length * 15;
  score -= moderateRisks.length * 5;
  score = Math.max(0, Math.min(100, score));

  const status = getStatus(score, config);

  // Build key finding with specific vulnerabilities
  let keyFinding: string;
  if (criticalRisks.length >= 2) {
    keyFinding = `Portfolio has CRITICAL vulnerabilities: ${criticalRisks.map(r => r.label).join(', ')}`;
  } else if (criticalRisks.length === 1) {
    keyFinding = `CRITICAL: ${criticalRisks[0].label} (${criticalRisks[0].score}/10) – ${criticalRisks[0].mitigation}`;
  } else if (highRisks.length >= 2) {
    keyFinding = `Elevated risks detected: ${highRisks.map(r => r.label).join(', ')}`;
  } else if (highRisks.length === 1) {
    keyFinding = `Elevated ${highRisks[0].label} (${highRisks[0].score}/10) may warrant attention`;
  } else if (status === 'GREEN') {
    keyFinding = 'Portfolio has adequate protection across all major risk categories';
  } else {
    keyFinding = 'Some risk exposures present but within acceptable ranges';
  }

  // Build headline metric
  const worstRisk = riskDetails.reduce((worst, r) => r.score > worst.score ? r : worst, riskDetails[0]);

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `${criticalRisks.length} critical, ${highRisks.length - criticalRisks.length} elevated risks (worst: ${worstRisk.label} ${worstRisk.score}/10)`,
    details: { 
      riskDetails,
      stockWeight, 
      bondWeight, 
      commodityWeight,
      cashWeight,
      intlWeight,
      threshold,
      criticalCount: criticalRisks.length,
      elevatedCount: highRisks.length,
    },
  };
}

// ============================================================================
// 7. RISK-ADJUSTED PERFORMANCE (GOAL PROBABILITY)
// ============================================================================
function analyzeRiskAdjusted(
  holdings: Holding[], 
  clientInfo: ClientInfo, 
  totalValue: number, 
  expectedReturn: number, 
  volatility: number,
  config: ScoringConfig
): DiagnosticResult {
  const sortinoRatio = volatility > 0 ? (expectedReturn - RISK_FREE_RATE) / (volatility * 0.7) : 0;
  const maxDrawdown = volatility * 2.5;
  
  // Monte Carlo-lite probability
  let probability = 50;
  if (clientInfo.targetAmount && clientInfo.yearsToGoal && totalValue > 0) {
    const requiredReturn = Math.pow(clientInfo.targetAmount / totalValue, 1 / clientInfo.yearsToGoal) - 1;
    const zScore = (expectedReturn - requiredReturn) / volatility;
    probability = Math.min(95, Math.max(5, 50 + zScore * 30));
  }

  // Score based on probability bands
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

  if (maxDrawdown > 0.4) score -= 20;
  score = Math.max(0, score);

  const status = getStatus(score, config);

  // Determine band label
  let bandLabel: string;
  if (probability >= config.goalProbability.greenMin) bandLabel = 'Comfortable';
  else if (probability >= config.goalProbability.yellowMin) bandLabel = 'Borderline';
  else bandLabel = 'At Risk';

  // Consistent key finding
  let keyFinding: string;
  if (probability >= config.goalProbability.greenMin) {
    keyFinding = `${probability.toFixed(0)}% probability of reaching goal – comfortable margin`;
  } else if (probability >= config.goalProbability.yellowMin) {
    keyFinding = `${probability.toFixed(0)}% probability of reaching goal is BORDERLINE – may require adjustments`;
  } else {
    keyFinding = `${probability.toFixed(0)}% probability of reaching goal is LOW – plan changes likely needed`;
  }

  return {
    status,
    score,
    keyFinding,
    headlineMetric: `Goal probability: ${probability.toFixed(0)}% (${bandLabel})`,
    details: { 
      sortinoRatio, 
      maxDrawdown, 
      probability, 
      bandLabel,
      greenMin: config.goalProbability.greenMin,
      yellowMin: config.goalProbability.yellowMin,
    },
  };
}

// ============================================================================
// 8. CRISIS RESILIENCE
// ============================================================================
function analyzeCrisisResilience(
  holdings: Holding[], 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
  const stockWeight = holdings
    .filter(h => h.assetClass === 'US Stocks' || h.assetClass === 'Intl Stocks')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;
  
  const bondWeight = holdings
    .filter(h => h.assetClass === 'Bonds')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;

  const scenarios = Object.entries(CRISIS_SCENARIOS).map(([key, scenario]) => ({
    name: scenario.name,
    portfolioImpact: stockWeight * scenario.equity + bondWeight * scenario.bonds,
    spImpact: scenario.equity,
  }));

  const avgImpact = scenarios.reduce((sum, s) => sum + s.portfolioImpact, 0) / scenarios.length;
  const avgSpImpact = scenarios.reduce((sum, s) => sum + s.spImpact, 0) / scenarios.length;
  
  // Compare portfolio to S&P
  const difference = avgImpact - avgSpImpact; // negative = better than S&P
  const betterThanSp = difference < -config.crisisResilience.betterThanSpThreshold;
  const similarToSp = Math.abs(difference) <= config.crisisResilience.similarToSpRange;
  const worseThanSp = difference > config.crisisResilience.betterThanSpThreshold;

  // Score based on comparison
  let score: number;
  if (betterThanSp) {
    score = 75 + Math.min(25, Math.abs(difference) * 100);
  } else if (similarToSp) {
    score = 50 + (1 - Math.abs(difference) / config.crisisResilience.similarToSpRange) * 20;
  } else {
    score = Math.max(0, 50 - difference * 200);
  }

  const status = getStatus(Math.min(100, score), config);

  // FIX: Key finding must match the actual comparison
  let keyFinding: string;
  if (betterThanSp) {
    keyFinding = `In major crashes, portfolio projected to lose LESS than S&P 500 – better downside resilience`;
  } else if (worseThanSp) {
    keyFinding = `In major crashes, portfolio projected to fall MORE than S&P 500 – higher drawdown exposure`;
  } else {
    keyFinding = `Crisis performance similar to S&P 500 – consider adding defensive positions`;
  }

  // Find worst scenario for headline
  const worst = scenarios.reduce((w, s) => s.portfolioImpact < w.portfolioImpact ? s : w, scenarios[0]);

  return {
    status,
    score: Math.min(100, score),
    keyFinding,
    headlineMetric: `${worst.name}: ${formatPct(worst.portfolioImpact, 0)}% vs S&P ${formatPct(worst.spImpact, 0)}%`,
    details: { 
      scenarios, 
      avgImpact, 
      avgSpImpact, 
      beta: stockWeight,
      betterThanSp,
      similarToSp,
      worseThanSp,
    },
  };
}

// ============================================================================
// 9. PORTFOLIO OPTIMIZATION
// ============================================================================
function analyzeOptimization(
  expectedReturn: number, 
  volatility: number, 
  sharpeRatio: number, 
  totalFees: number, 
  totalValue: number,
  config: ScoringConfig
): DiagnosticResult {
  const targetSharpe = config.sharpe.portfolioTarget;
  const optimizedSharpe = sharpeRatio * 1.15;
  const improvementPotential = (optimizedSharpe - sharpeRatio) / Math.max(sharpeRatio, 0.01);
  
  const recommendations = [];
  if (totalFees / totalValue > 0.005) {
    recommendations.push('Reduce expense ratios by switching to index funds');
  }
  if (volatility > 0.15) {
    recommendations.push('Add bond allocation to reduce volatility');
  }

  // Score based on: 1) current vs target Sharpe, 2) improvement potential
  let score: number;
  if (sharpeRatio >= targetSharpe) {
    // At or above target
    score = 75 + Math.min(25, (sharpeRatio - targetSharpe) * 50);
  } else {
    // Below target - cannot be GREEN
    const gap = targetSharpe - sharpeRatio;
    score = Math.max(0, 70 - gap * 100);
  }

  // Also penalize if significant improvement is possible
  if (improvementPotential > 0.15) score = Math.min(score, 65);
  if (improvementPotential > 0.20) score = Math.min(score, 50);

  const status = getStatus(score, config);

  // Consistent key finding - if below target, cannot say "Good"
  let keyFinding: string;
  if (sharpeRatio >= targetSharpe && improvementPotential < 0.10) {
    keyFinding = 'Portfolio is near-optimal – limited room for improvement';
  } else if (sharpeRatio < targetSharpe) {
    keyFinding = `Current Sharpe ${sharpeRatio.toFixed(2)} is below target ${targetSharpe.toFixed(2)} – optimization could materially improve returns`;
  } else {
    keyFinding = `${formatPct(improvementPotential, 0)}% Sharpe improvement possible through rebalancing`;
  }

  return {
    status,
    score: Math.max(0, score),
    keyFinding,
    headlineMetric: `Sharpe: ${sharpeRatio.toFixed(2)} current → ${optimizedSharpe.toFixed(2)} optimized (Target: ${targetSharpe.toFixed(2)})`,
    details: {
      currentSharpe: sharpeRatio,
      targetSharpe,
      optimizedSharpe,
      improvementPotential,
      recommendations,
      beforeAfter: {
        current: { expectedReturn, volatility, sharpeRatio, fees: totalFees },
        optimized: { 
          expectedReturn: expectedReturn * 1.05, 
          volatility: volatility * 0.95, 
          sharpeRatio: optimizedSharpe, 
          fees: totalFees * 0.5 
        },
      },
    },
  };
}

// ============================================================================
// 10. PLANNING GAPS
// ============================================================================
function analyzePlanningGaps(
  checklist: PlanningChecklist,
  config: ScoringConfig
): DiagnosticResult {
  const checklistItems = {
    willTrust: { name: 'Will/Trust', critical: true },
    beneficiaryReview: { name: 'Beneficiary Review', critical: false },
    poaDirectives: { name: 'POA/Healthcare Directives', critical: true },
    digitalAssetPlan: { name: 'Digital Asset Plan', critical: false },
    insuranceCoverage: { name: 'Insurance Coverage', critical: false },
    emergencyFund: { name: 'Emergency Fund', critical: true },
    withdrawalStrategy: { name: 'Withdrawal Strategy', critical: false },
  };

  const items = Object.entries(checklist) as [keyof PlanningChecklist, boolean][];
  const completed = items.filter(([_, v]) => v).length;
  const total = items.length;
  
  // Find missing items
  const missingItems = items
    .filter(([_, v]) => !v)
    .map(([k]) => checklistItems[k]?.name || k);
  
  // Find critical missing items
  const criticalMissing = items
    .filter(([k, v]) => !v && config.planningGaps.criticalItems.includes(k))
    .map(([k]) => checklistItems[k]?.name || k);

  // Score
  let score: number;
  if (completed >= config.planningGaps.greenMinComplete) {
    score = 70 + ((completed - config.planningGaps.greenMinComplete) / (total - config.planningGaps.greenMinComplete)) * 30;
  } else if (completed >= config.planningGaps.yellowMinComplete) {
    const range = config.planningGaps.greenMinComplete - config.planningGaps.yellowMinComplete;
    score = 40 + ((completed - config.planningGaps.yellowMinComplete) / range) * 30;
  } else {
    score = (completed / config.planningGaps.yellowMinComplete) * 40;
  }

  // Extra penalty for critical items
  score -= criticalMissing.length * 15;
  score = Math.max(0, score);

  const status = getStatus(score, config);

  // Consistent key finding - specify what's missing
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
// GENERATE RECOMMENDATIONS
// ============================================================================
function generateRecommendations(analysis: Omit<PortfolioAnalysis, 'recommendations'>): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let priority = 1;

  const { diagnostics } = analysis;

  if (diagnostics.riskManagement.status === 'RED') {
    const details = diagnostics.riskManagement.details as { maxSinglePositionPct: number };
    recommendations.push({
      id: `rec-${priority}`,
      category: 'riskManagement',
      priority: priority++,
      title: 'Reduce position concentration',
      description: `Largest position exceeds ${formatPct(details.maxSinglePositionPct || 0.10, 0)}% threshold`,
      impact: 'Reduces single-stock risk by 30%',
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

  if (diagnostics.returnEfficiency.status !== 'GREEN') {
    const details = diagnostics.returnEfficiency.details as { targetSharpe: number };
    recommendations.push({
      id: `rec-${priority}`,
      category: 'returnEfficiency',
      priority: priority++,
      title: 'Improve return efficiency',
      description: `Work toward Sharpe ratio target of ${(details.targetSharpe || 0.5).toFixed(2)}`,
      impact: 'Better risk-adjusted returns',
    });
  }

  if (diagnostics.diversification.status !== 'GREEN') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'diversification',
      priority: priority++,
      title: 'Improve diversification',
      description: 'Reduce concentration or add underweighted asset classes',
      impact: 'Lower portfolio correlation risk',
    });
  }

  if (diagnostics.protection.status === 'RED') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'protection',
      priority: priority++,
      title: 'Address vulnerability gaps',
      description: 'Portfolio has multiple high-risk exposure areas',
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
  advisorFee: number = 0
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
        riskManagement: emptyResult,
        protection: emptyResult,
        returnEfficiency: emptyResult,
        costAnalysis: emptyResult,
        taxEfficiency: emptyResult,
        diversification: emptyResult,
        riskAdjusted: emptyResult,
        crisisResilience: emptyResult,
        optimization: emptyResult,
        planningGaps: analyzePlanningGaps(planningChecklist, config),
      },
      recommendations: [],
    };
  }

  const diagnostics = {
    riskManagement: analyzeRiskManagement(holdings, clientInfo, metrics.totalValue, metrics.volatility, config),
    protection: analyzeProtection(holdings, metrics.totalValue, config),
    returnEfficiency: analyzeReturnEfficiency(holdings, metrics.totalValue, metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio, config),
    costAnalysis: analyzeCosts(holdings, metrics.totalValue, metrics.totalFees, adviceModel, advisorFee, config),
    taxEfficiency: analyzeTaxEfficiency(holdings, metrics.totalValue, config),
    diversification: analyzeDiversification(holdings, metrics.totalValue, config),
    riskAdjusted: analyzeRiskAdjusted(holdings, clientInfo, metrics.totalValue, metrics.expectedReturn, metrics.volatility, config),
    crisisResilience: analyzeCrisisResilience(holdings, metrics.totalValue, config),
    optimization: analyzeOptimization(metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio, metrics.totalFees, metrics.totalValue, config),
    planningGaps: analyzePlanningGaps(planningChecklist, config),
  };

  // Calculate overall health score
  const scores = Object.values(diagnostics).map(d => d.score);
  const healthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const analysisWithoutRecs = {
    healthScore,
    ...metrics,
    diagnostics,
  };

  return {
    ...analysisWithoutRecs,
    recommendations: generateRecommendations(analysisWithoutRecs as PortfolioAnalysis),
  };
}
