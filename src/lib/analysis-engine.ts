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
  const goodPctThreshold = 0.90;
  const belowTargetPctThreshold = 0.70;

  // Calculate holding-level Sharpe using ticker-specific data when available
  const holdingEfficiency = holdings.map(h => {
    const value = h.shares * h.currentPrice;
    const weight = value / totalValue;
    
    // Use ticker-specific estimates if available, otherwise fall back to asset class
    const tickerData = TICKER_ESTIMATES[h.ticker.toUpperCase()];
    const assetReturn = tickerData?.expectedReturn || EXPECTED_RETURNS[h.assetClass] || 0.06;
    const assetVol = tickerData?.volatility || VOLATILITY[h.assetClass] || 0.12;
    const holdingSharpe = assetVol > 0 ? (assetReturn - RISK_FREE_RATE) / assetVol : 0;
    const usesTickerData = !!tickerData;
    
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
      expectedReturn: assetReturn,
      volatility: assetVol,
      usesTickerData,
    };
  });

  // Check how many holdings use ticker-specific vs asset-class data
  const tickerDataCount = holdingEfficiency.filter(h => h.usesTickerData).length;
  const assetClassCount = holdingEfficiency.length - tickerDataCount;

  // Scoring based on percentage of target achieved
  let score: number;
  if (sharpeRatio >= targetSharpe) {
    score = 85 + Math.min(15, (sharpeRatio - targetSharpe) * 30);
  } else {
    score = Math.max(0, sharpeRatio100 * 0.85);
  }
  score = Math.max(0, Math.min(100, score));

  const status = getStatus(score, config);

  // Enhanced key finding with educational context
  let keyFinding: string;
  const sharpeExplainer = "Sharpe ratio measures return earned per unit of risk – higher is better. Below target means you're taking more volatility than necessary for the returns.";
  
  if (sharpeRatio >= targetSharpe) {
    keyFinding = `Portfolio Sharpe ${sharpeRatio.toFixed(2)} meets ${targetSharpe.toFixed(2)} target. ${sharpeExplainer}`;
  } else if (sharpeRatio100 < 70) {
    keyFinding = `Portfolio Sharpe ${sharpeRatio.toFixed(2)} is only ${Math.round(sharpeRatio100)}% of target – risk-adjusted returns are POOR. ${sharpeExplainer}`;
  } else {
    keyFinding = `Portfolio Sharpe ${sharpeRatio.toFixed(2)} is ${Math.round(sharpeRatio100)}% of ${targetSharpe.toFixed(2)} target – below optimal. ${sharpeExplainer}`;
  }

  // Note about data sources
  const dataSourceNote = assetClassCount > 0 
    ? `Note: ${tickerDataCount} holdings use ticker-specific estimates; ${assetClassCount} use asset class averages.`
    : undefined;

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
      holdingEfficiency: holdingEfficiency.slice(0, 15),
      goodPctThreshold: Math.round(goodPctThreshold * 100),
      belowTargetPctThreshold: Math.round(belowTargetPctThreshold * 100),
      tickerDataCount,
      assetClassCount,
      dataSourceNote,
    },
  };
}

// ============================================================================
// 3. COST & FEE ANALYSIS
// ============================================================================
import { ADVICE_MODEL_LABELS } from './scoring-config';

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

  // Model labels for display
  const modelLabel = adviceModel === 'self-directed' ? 'self-directed' 
    : adviceModel === 'advisor-passive' ? 'passive advisor' : 'tactical advisor';
  
  // Enhanced key finding with explicit fee breakdown
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

  // Build full holdings data for detail view
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
  }).sort((a, b) => a.gainLoss - b.gainLoss); // Sort by gain/loss (losses first)

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

  // Enhanced key finding with education
  const diversEducation = "True diversification means no single position or sector can materially impact your portfolio. Even 'diversified' portfolios can be concentrated in their top holdings.";
  const assetClassCount = Object.values(assetClassWeights).filter(w => w > 0).length;
  
  let keyFinding: string;
  if (top3TooConcentrated) {
    keyFinding = `${numHoldings} holdings is ${label.toLowerCase()}, but top 3 positions = ${formatPct(top3Weight, 0)}% of portfolio – this concentration means a bad quarter for just 3 stocks could significantly impact your wealth. ${diversEducation}`;
  } else if (top10TooConcentrated) {
    keyFinding = `Top 10 holdings = ${formatPct(top10Weight, 0)}%, above ${formatPct(config.diversification.top10ConcentrationMax, 0)}% target. ${diversEducation}`;
  } else if (tooFewHoldings) {
    keyFinding = `Only ${numHoldings} holdings provides limited diversification. Consider 15-40 positions for better risk distribution. ${diversEducation}`;
  } else if (status === 'GREEN') {
    keyFinding = `${numHoldings} holdings across ${assetClassCount} asset classes provides solid diversification. Top 10 = ${formatPct(top10Weight, 0)}% is within guidelines. ${diversEducation}`;
  } else {
    keyFinding = `Diversification could be improved through broader asset class exposure or reducing concentration in top holdings. ${diversEducation}`;
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
      description: 'Inflation erodes purchasing power over time. With 3% inflation, $100,000 today buys only $74,000 worth of goods in 10 years.',
      mitigation: 'Consider TIPS, commodities, real estate, or I-Bonds to maintain purchasing power',
    },
    {
      name: 'interestRateRisk',
      label: 'Interest Rate Risk',
      score: Math.round(bondWeight * 8 + (bondWeight > 0.4 ? 2 : 0)),
      maxScore: 10,
      severity: 'LOW',
      description: 'When interest rates rise, existing bond values fall. Longer-duration bonds are more sensitive to rate changes.',
      mitigation: 'Shorten bond duration or ladder maturities to reduce rate sensitivity',
    },
    {
      name: 'marketCrashRisk',
      label: 'Market Crash Risk',
      score: Math.round(stockWeight * 10),
      maxScore: 10,
      severity: 'LOW',
      description: 'Equity markets can drop 30-50% in severe downturns. Recovery can take years, problematic if you need funds soon.',
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
      description: 'Poor returns early in retirement, combined with withdrawals, can permanently deplete a portfolio even if markets later recover.',
      mitigation: 'BEST SOLUTION: Establish guaranteed lifetime income (annuities, Social Security optimization) sufficient to cover core living expenses. This eliminates sequence risk for essential needs.',
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

  // Build key finding with specific vulnerabilities and education
  let keyFinding: string;
  const protectionEducation = "Protection analysis evaluates six major risk categories. Scores above 7/10 indicate significant exposure requiring attention.";
  
  if (criticalRisks.length >= 2) {
    keyFinding = `CRITICAL vulnerabilities in ${criticalRisks.map(r => r.label).join(' and ')}. ${protectionEducation}`;
  } else if (criticalRisks.length === 1) {
    keyFinding = `CRITICAL: ${criticalRisks[0].label} (${criticalRisks[0].score}/10). ${criticalRisks[0].mitigation}`;
  } else if (highRisks.length >= 2) {
    keyFinding = `Elevated risk in ${highRisks.map(r => r.label).join(' and ')}. ${protectionEducation}`;
  } else if (highRisks.length === 1) {
    keyFinding = `Elevated ${highRisks[0].label} (${highRisks[0].score}/10). ${highRisks[0].description}`;
  } else if (status === 'GREEN') {
    keyFinding = `Portfolio shows adequate protection across all six risk categories. ${protectionEducation}`;
  } else {
    keyFinding = `Some risk exposures present but within acceptable ranges. ${protectionEducation}`;
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
  
  // Check if core expenses are secured by lifetime income
  const coreSecured = lifetimeIncomeData && lifetimeIncomeData.coreCoveragePct >= 1.0;
  const partiallyCovered = lifetimeIncomeData && lifetimeIncomeData.coreCoveragePct >= 0.5 && lifetimeIncomeData.coreCoveragePct < 1.0;
  
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

  // Boost score if core expenses are secured
  if (coreSecured) {
    score = Math.min(100, score + 15);
  } else if (partiallyCovered) {
    score = Math.min(100, score + 5);
  }

  if (maxDrawdown > 0.4) score -= 20;
  score = Math.max(0, score);

  const status = getStatus(score, config);

  // Determine band label
  let bandLabel: string;
  if (probability >= config.goalProbability.greenMin) bandLabel = 'Comfortable';
  else if (probability >= config.goalProbability.yellowMin) bandLabel = 'Borderline';
  else bandLabel = 'At Risk';

  // Reframed key finding when core is secured - with education
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
  
  // Compare portfolio to S&P - portfolio impact and spImpact are both NEGATIVE numbers
  // Less negative (closer to 0) = better performance = loses less
  // avgImpact > avgSpImpact means portfolio loses LESS (e.g., -30% > -45%)
  const portfolioLosesLess = avgImpact > avgSpImpact + config.crisisResilience.betterThanSpThreshold;
  const portfolioLosesMore = avgImpact < avgSpImpact - config.crisisResilience.betterThanSpThreshold;
  const similarToSp = !portfolioLosesLess && !portfolioLosesMore;

  // Score based on absolute loss severity AND comparison to S&P
  // Status is based on loss severity, not comparison
  const avgLossSeverity = Math.abs(avgImpact);
  let score: number;
  if (avgLossSeverity < 0.25) {
    score = 85 + Math.min(15, (0.25 - avgLossSeverity) * 60);
  } else if (avgLossSeverity < 0.35) {
    score = 60 + (0.35 - avgLossSeverity) * 250;
  } else if (avgLossSeverity < 0.45) {
    score = 40 + (0.45 - avgLossSeverity) * 200;
  } else {
    score = Math.max(0, 40 - (avgLossSeverity - 0.45) * 100);
  }
  
  // Bonus for beating S&P
  if (portfolioLosesLess) score = Math.min(100, score + 10);

  const status = getStatus(Math.min(100, score), config);

  // Key finding: accurately describe comparison AND severity
  const crisisEducation = "Crisis resilience tests how your portfolio might perform in historical crash scenarios like 2008.";
  
  let comparisonText: string;
  if (portfolioLosesLess) {
    comparisonText = `loses LESS than S&P 500 (avg ${formatPct(avgImpact, 0)}% vs S&P ${formatPct(avgSpImpact, 0)}%)`;
  } else if (portfolioLosesMore) {
    comparisonText = `loses MORE than S&P 500 (avg ${formatPct(avgImpact, 0)}% vs S&P ${formatPct(avgSpImpact, 0)}%)`;
  } else {
    comparisonText = `performs similarly to S&P 500 in crashes (avg ${formatPct(avgImpact, 0)}%)`;
  }

  let keyFinding: string;
  if (avgLossSeverity > 0.40) {
    keyFinding = `In major crises, portfolio ${comparisonText}. Projected losses are still significant – consider defensive strategies. ${crisisEducation}`;
  } else if (avgLossSeverity > 0.25) {
    keyFinding = `In major crises, portfolio ${comparisonText}. Moderate downside protection from diversification. ${crisisEducation}`;
  } else {
    keyFinding = `In major crises, portfolio ${comparisonText}. Strong defensive positioning. ${crisisEducation}`;
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
      portfolioLosesLess,
      portfolioLosesMore,
      similarToSp,
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
  
  // Estimate optimized Sharpe through fee reduction and rebalancing
  const feeReductionPotential = Math.min(totalFees / totalValue * 0.5, 0.005); // Can save up to 0.5% in fees
  const rebalancingImprovement = volatility > 0.15 ? 0.02 : 0.01; // Better allocation
  const optimizedReturn = expectedReturn + feeReductionPotential;
  const optimizedVol = volatility * 0.95; // Modest vol reduction from better diversification
  const optimizedSharpe = optimizedVol > 0 ? (optimizedReturn - 0.03) / optimizedVol : sharpeRatio;
  
  const absoluteImprovement = optimizedSharpe - sharpeRatio;
  const relativeImprovement = sharpeRatio > 0 ? absoluteImprovement / sharpeRatio : 0;
  
  const recommendations = [];
  if (totalFees / totalValue > 0.005) {
    recommendations.push('Reduce expense ratios by switching to index funds/ETFs');
  }
  if (volatility > 0.15) {
    recommendations.push('Add bond allocation to reduce overall portfolio volatility');
  }
  if (sharpeRatio < targetSharpe) {
    recommendations.push('Rebalance to improve risk-adjusted returns toward target');
  }

  // Score based on improvement potential (not current Sharpe - that's covered in Return Efficiency)
  let score: number;
  if (relativeImprovement < 0.05) {
    // Less than 5% improvement possible - already well optimized
    score = 85 + Math.min(15, (0.05 - relativeImprovement) * 300);
  } else if (relativeImprovement < 0.15) {
    // 5-15% improvement possible - moderate room
    score = 60 + (0.15 - relativeImprovement) * 250;
  } else {
    // >15% improvement possible - significant optimization needed
    score = Math.max(20, 60 - (relativeImprovement - 0.15) * 200);
  }

  const status = getStatus(score, config);

  // Key finding focuses on IMPROVEMENT POTENTIAL, not current Sharpe
  const optEducation = "Optimization analyzes potential gains from fee reduction, rebalancing, and better diversification.";
  
  let keyFinding: string;
  if (relativeImprovement < 0.05) {
    keyFinding = `Portfolio is well-optimized – less than 5% improvement possible. ${optEducation}`;
  } else if (relativeImprovement < 0.15) {
    keyFinding = `Moderate optimization opportunity: ~${formatPct(relativeImprovement, 0)}% Sharpe improvement possible through ${recommendations[0]?.toLowerCase() || 'rebalancing'}. ${optEducation}`;
  } else {
    keyFinding = `Significant optimization opportunity: ~${formatPct(relativeImprovement, 0)}% Sharpe improvement possible. ${recommendations.slice(0, 2).join('; ')}. ${optEducation}`;
  }

  return {
    status,
    score: Math.max(0, score),
    keyFinding,
    headlineMetric: `Improvement potential: +${formatPct(relativeImprovement, 0)}% (${sharpeRatio.toFixed(2)} → ${optimizedSharpe.toFixed(2)})`,
    details: {
      currentSharpe: sharpeRatio,
      targetSharpe,
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
// 10. PLANNING GAPS
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
// 11. LIFETIME INCOME SECURITY
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
  
  // Sum guaranteed lifetime income
  const guaranteedIncome = guaranteedSources
    .filter(s => s.guaranteedForLife)
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
  
  // Handle case where no data is entered
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
  
  // Calculate coverage ratios
  const coreCoverage = coreLivingExpensesMonthly > 0 
    ? guaranteedIncome / coreLivingExpensesMonthly 
    : 0;
  const totalCoverage = totalExpenses > 0 
    ? guaranteedIncome / totalExpenses 
    : 0;
  
  // Calculate shortfall/surplus
  const shortfall = Math.max(0, coreLivingExpensesMonthly - guaranteedIncome);
  const surplus = Math.max(0, guaranteedIncome - coreLivingExpensesMonthly);
  
  // Score based on coverage
  let score: number;
  if (coreCoverage >= config.lifetimeIncomeSecurity.coreCoverageGreen) {
    // 100%+ coverage: score 85-100 with bonus for surplus
    score = 85 + Math.min(15, (coreCoverage - 1.0) * 30);
  } else if (coreCoverage >= config.lifetimeIncomeSecurity.coreCoverageYellow) {
    // 80-100% coverage: score 40-85
    const range = config.lifetimeIncomeSecurity.coreCoverageGreen - config.lifetimeIncomeSecurity.coreCoverageYellow;
    score = 40 + ((coreCoverage - config.lifetimeIncomeSecurity.coreCoverageYellow) / range) * 45;
  } else {
    // <80% coverage: score 0-40
    score = (coreCoverage / config.lifetimeIncomeSecurity.coreCoverageYellow) * 40;
  }
  
  const status = getStatus(Math.min(100, Math.max(0, score)), config);
  
  // Build key finding with education
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

  // Lifetime Income Security recommendation
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
    riskManagement: analyzeRiskManagement(holdings, clientInfo, metrics.totalValue, metrics.volatility, config),
    protection: analyzeProtection(holdings, metrics.totalValue, config),
    returnEfficiency: analyzeReturnEfficiency(holdings, metrics.totalValue, metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio, config),
    costAnalysis: analyzeCosts(holdings, metrics.totalValue, metrics.totalFees, adviceModel, advisorFee, config),
    taxEfficiency: analyzeTaxEfficiency(holdings, metrics.totalValue, config),
    diversification: analyzeDiversification(holdings, metrics.totalValue, config),
    riskAdjusted: analyzeRiskAdjusted(holdings, clientInfo, metrics.totalValue, metrics.expectedReturn, metrics.volatility, config, lifetimeIncomeAnalysisData),
    crisisResilience: analyzeCrisisResilience(holdings, metrics.totalValue, config),
    optimization: analyzeOptimization(metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio, metrics.totalFees, metrics.totalValue, config),
    planningGaps: analyzePlanningGaps(planningChecklist, config),
    lifetimeIncomeSecurity: lifetimeIncomeResult,
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
