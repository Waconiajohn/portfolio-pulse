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

function getStatus(score: number): DiagnosticStatus {
  if (score >= 70) return 'GREEN';
  if (score >= 40) return 'YELLOW';
  return 'RED';
}

function calculatePortfolioMetrics(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.costBasis, 0);
  
  if (totalValue === 0) {
    return { totalValue: 0, totalCost: 0, expectedReturn: 0, volatility: 0, sharpeRatio: 0, totalFees: 0 };
  }

  // Calculate weighted returns and volatility
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
    weightedVolatility += weight * assetVol; // Simplified - not accounting for correlations
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

function analyzeRiskManagement(holdings: Holding[], clientInfo: ClientInfo, totalValue: number, volatility: number): DiagnosticResult {
  const targetVol = TARGET_VOLATILITY[clientInfo.riskTolerance];
  const riskGap = Math.abs(volatility - targetVol) / targetVol;
  
  // Position concentration
  const positions = holdings.map(h => ({
    ticker: h.ticker,
    weight: (h.shares * h.currentPrice) / totalValue,
  })).sort((a, b) => b.weight - a.weight);
  
  const topPosition = positions[0]?.weight || 0;
  const hasConcentration = topPosition > 0.1;

  // Sector concentration
  const sectorWeights: Record<string, number> = {};
  holdings.forEach(h => {
    const sector = SECTOR_MAPPING[h.ticker] || 'Other';
    const weight = (h.shares * h.currentPrice) / totalValue;
    sectorWeights[sector] = (sectorWeights[sector] || 0) + weight;
  });
  const topSector = Math.max(...Object.values(sectorWeights), 0);
  const hasSectorConcentration = topSector > 0.3;

  let score = 100;
  if (riskGap > 0.15) score -= 40;
  else if (riskGap > 0.05) score -= 20;
  if (hasConcentration) score -= 25;
  if (hasSectorConcentration) score -= 15;

  const gapPercent = ((volatility - targetVol) * 100).toFixed(1);
  const direction = volatility > targetVol ? 'above' : 'below';

  return {
    status: getStatus(score),
    score,
    keyFinding: hasConcentration 
      ? `Top position (${positions[0]?.ticker}) is ${(topPosition * 100).toFixed(1)}% of portfolio`
      : `Portfolio volatility is ${Math.abs(parseFloat(gapPercent))}% ${direction} target`,
    headlineMetric: `Risk gap: ${gapPercent}%`,
    details: {
      currentVolatility: volatility,
      targetVolatility: targetVol,
      riskGap: riskGap,
      topPositions: positions.slice(0, 5),
      sectorWeights,
      hasConcentration,
      hasSectorConcentration,
    },
  };
}

function analyzeReturnEfficiency(holdings: Holding[], totalValue: number, expectedReturn: number, volatility: number, sharpeRatio: number): DiagnosticResult {
  const benchmarkSharpe = 0.5; // S&P 500 historical average
  const sharpeGap = sharpeRatio - benchmarkSharpe;
  
  // Analyze individual holdings contribution
  const holdingEfficiency = holdings.map(h => {
    const value = h.shares * h.currentPrice;
    const weight = value / totalValue;
    const assetReturn = EXPECTED_RETURNS[h.assetClass] || 0.06;
    const assetVol = VOLATILITY[h.assetClass] || 0.12;
    const holdingSharpe = assetVol > 0 ? (assetReturn - RISK_FREE_RATE) / assetVol : 0;
    
    return {
      ticker: h.ticker,
      sharpe: holdingSharpe,
      contribution: holdingSharpe > benchmarkSharpe ? 'GOOD' : holdingSharpe > benchmarkSharpe * 0.7 ? 'NEUTRAL' : 'POOR',
      weight,
    };
  });

  let score = 50 + sharpeGap * 100;
  score = Math.max(0, Math.min(100, score));

  return {
    status: getStatus(score),
    score,
    keyFinding: sharpeGap >= 0 
      ? 'Portfolio is generating efficient risk-adjusted returns'
      : `Sharpe ratio ${Math.abs(sharpeGap).toFixed(2)} below benchmark`,
    headlineMetric: `Sharpe: ${sharpeRatio.toFixed(2)} vs ${benchmarkSharpe.toFixed(2)} benchmark`,
    details: {
      sharpeRatio,
      benchmarkSharpe,
      expectedReturn,
      volatility,
      holdingEfficiency: holdingEfficiency.slice(0, 10),
    },
  };
}

function analyzeCosts(holdings: Holding[], totalValue: number, totalFees: number): DiagnosticResult {
  const feePercent = totalValue > 0 ? totalFees / totalValue : 0;
  const tenYearImpact = totalValue * (1 - Math.pow(1 - feePercent, 10)) + totalFees * 10;
  
  const holdingFees = holdings.map(h => ({
    ticker: h.ticker,
    value: h.shares * h.currentPrice,
    expenseRatio: h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf,
    annualFee: h.shares * h.currentPrice * (h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf),
  })).sort((a, b) => b.annualFee - a.annualFee);

  let score = 100;
  if (feePercent > 0.01) score = 20;
  else if (feePercent > 0.005) score = 50;
  else if (feePercent > 0.003) score = 70;

  return {
    status: getStatus(score),
    score,
    keyFinding: feePercent > 0.005 
      ? `High fees eroding ${(feePercent * 100).toFixed(2)}% annually`
      : 'Fee structure is reasonable',
    headlineMetric: `Total fees: $${totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr (${(feePercent * 100).toFixed(2)}%)`,
    details: {
      totalFees,
      feePercent,
      tenYearImpact,
      holdingFees,
    },
  };
}

function analyzeTaxEfficiency(holdings: Holding[], totalValue: number): DiagnosticResult {
  const taxableHoldings = holdings.filter(h => h.accountType === 'Taxable');
  
  // Loss harvesting candidates
  const lossCandidates = taxableHoldings.filter(h => h.currentPrice < h.costBasis);
  const totalHarvestable = lossCandidates.reduce((sum, h) => 
    sum + h.shares * (h.costBasis - h.currentPrice), 0
  );
  const estimatedTaxSavings = totalHarvestable * 0.25; // Assume 25% tax rate

  // Tax-inefficient assets in taxable accounts
  const inefficientInTaxable = taxableHoldings.filter(h => 
    h.assetClass === 'Bonds' || h.assetClass === 'Commodities'
  );

  let score = 80;
  if (totalHarvestable > totalValue * 0.03) score += 10; // Harvesting opportunity
  if (inefficientInTaxable.length > 0) score -= 30;

  return {
    status: getStatus(score),
    score,
    keyFinding: totalHarvestable > 0 
      ? `$${totalHarvestable.toLocaleString(undefined, { maximumFractionDigits: 0 })} in harvestable losses available`
      : inefficientInTaxable.length > 0 
        ? 'Tax-inefficient assets in taxable accounts'
        : 'Tax positioning is efficient',
    headlineMetric: `Potential tax savings: $${estimatedTaxSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    details: {
      lossCandidates,
      totalHarvestable,
      estimatedTaxSavings,
      inefficientInTaxable,
    },
  };
}

function analyzeDiversification(holdings: Holding[], totalValue: number): DiagnosticResult {
  const numHoldings = holdings.length;
  
  // Asset class distribution
  const assetClassWeights: Record<AssetClass, number> = {
    'US Stocks': 0, 'Intl Stocks': 0, 'Bonds': 0, 'Commodities': 0, 'Cash': 0, 'Other': 0
  };
  holdings.forEach(h => {
    const weight = (h.shares * h.currentPrice) / totalValue;
    assetClassWeights[h.assetClass] += weight;
  });

  // Top 10 concentration
  const sortedByWeight = holdings
    .map(h => ({ ticker: h.ticker, weight: (h.shares * h.currentPrice) / totalValue }))
    .sort((a, b) => b.weight - a.weight);
  const top10Weight = sortedByWeight.slice(0, 10).reduce((sum, h) => sum + h.weight, 0);

  let score = 70;
  if (numHoldings < 5) score -= 30;
  else if (numHoldings > 50) score -= 10;
  if (top10Weight > 0.6) score -= 20;
  if (assetClassWeights['Bonds'] < 0.1 && assetClassWeights['US Stocks'] > 0.7) score -= 15;

  const label = numHoldings < 5 ? 'TOO FEW' : numHoldings > 50 ? 'TOO MANY' : 'ADEQUATE';

  return {
    status: getStatus(score),
    score,
    keyFinding: top10Weight > 0.6 
      ? `Top 10 holdings represent ${(top10Weight * 100).toFixed(0)}% of portfolio`
      : `${numHoldings} holdings across ${Object.values(assetClassWeights).filter(w => w > 0).length} asset classes`,
    headlineMetric: `Holdings: ${numHoldings} (${label})`,
    details: {
      numHoldings,
      assetClassWeights,
      top10: sortedByWeight.slice(0, 10),
      top10Weight,
      holdingCountLabel: label,
    },
  };
}

function analyzeProtection(holdings: Holding[], totalValue: number): DiagnosticResult {
  // Simplified risk bucket scoring
  const stockWeight = holdings
    .filter(h => h.assetClass === 'US Stocks' || h.assetClass === 'Intl Stocks')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;
  
  const bondWeight = holdings
    .filter(h => h.assetClass === 'Bonds')
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0) / totalValue;

  const scores = {
    inflationRisk: Math.round((1 - bondWeight * 0.5) * 10),
    interestRateRisk: Math.round(bondWeight * 8),
    marketCrashRisk: Math.round(stockWeight * 10),
    liquidityRisk: 3,
    creditRisk: 2,
  };

  const highRisks = Object.values(scores).filter(s => s > 7).length;
  let score = 100 - highRisks * 20;

  return {
    status: getStatus(score),
    score,
    keyFinding: highRisks >= 3 
      ? 'Multiple high vulnerability areas detected'
      : 'Portfolio has reasonable protection',
    headlineMetric: `${highRisks} high-risk areas`,
    details: { scores, stockWeight, bondWeight },
  };
}

function analyzeRiskAdjusted(holdings: Holding[], clientInfo: ClientInfo, totalValue: number, expectedReturn: number, volatility: number): DiagnosticResult {
  const sortinoRatio = volatility > 0 ? (expectedReturn - RISK_FREE_RATE) / (volatility * 0.7) : 0; // Simplified
  const maxDrawdown = volatility * 2.5; // Rough estimate
  
  // Monte Carlo-lite probability
  let probability = 50;
  if (clientInfo.targetAmount && clientInfo.yearsToGoal && totalValue > 0) {
    const requiredReturn = Math.pow(clientInfo.targetAmount / totalValue, 1 / clientInfo.yearsToGoal) - 1;
    const zScore = (expectedReturn - requiredReturn) / volatility;
    probability = Math.min(95, Math.max(5, 50 + zScore * 30));
  }

  let score = probability;
  if (maxDrawdown > 0.4) score -= 20;

  return {
    status: getStatus(score),
    score,
    keyFinding: probability >= 75 
      ? 'High probability of achieving financial goals'
      : `${probability.toFixed(0)}% probability of reaching target`,
    headlineMetric: `Goal probability: ${probability.toFixed(0)}%`,
    details: { sortinoRatio, maxDrawdown, probability },
  };
}

function analyzeCrisisResilience(holdings: Holding[], totalValue: number): DiagnosticResult {
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
  
  let score = 50;
  if (avgImpact > avgSpImpact) score = 30;
  else if (avgImpact > avgSpImpact * 0.8) score = 50;
  else score = 70 + (avgSpImpact - avgImpact) * 100;

  return {
    status: getStatus(Math.min(100, score)),
    score: Math.min(100, score),
    keyFinding: avgImpact > avgSpImpact 
      ? 'Portfolio more vulnerable than S&P in downturns'
      : 'Portfolio shows defensive characteristics',
    headlineMetric: `Avg crisis loss: ${(avgImpact * 100).toFixed(0)}% vs S&P ${(avgSpImpact * 100).toFixed(0)}%`,
    details: { scenarios, avgImpact, avgSpImpact, beta: stockWeight },
  };
}

function analyzeOptimization(expectedReturn: number, volatility: number, sharpeRatio: number, totalFees: number, totalValue: number): DiagnosticResult {
  // Estimate potential optimized Sharpe
  const optimizedSharpe = sharpeRatio * 1.15; // 15% improvement potential
  const improvementPotential = (optimizedSharpe - sharpeRatio) / sharpeRatio;
  
  const recommendations = [];
  if (totalFees / totalValue > 0.005) {
    recommendations.push('Reduce expense ratios by switching to index funds');
  }
  if (volatility > 0.15) {
    recommendations.push('Add bond allocation to reduce volatility');
  }

  let score = 100 - improvementPotential * 200;

  return {
    status: getStatus(score),
    score: Math.max(0, score),
    keyFinding: improvementPotential > 0.1 
      ? `${(improvementPotential * 100).toFixed(0)}% Sharpe improvement possible`
      : 'Portfolio is near-optimal',
    headlineMetric: `Current Sharpe: ${sharpeRatio.toFixed(2)} → Optimized: ${optimizedSharpe.toFixed(2)}`,
    details: {
      currentSharpe: sharpeRatio,
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

function analyzePlanningGaps(checklist: PlanningChecklist): DiagnosticResult {
  const items = Object.values(checklist);
  const completed = items.filter(Boolean).length;
  const total = items.length;
  const completionRate = completed / total;

  let score = completionRate * 100;
  const criticalItems = [checklist.willTrust, checklist.poaDirectives, checklist.emergencyFund];
  const criticalMissing = criticalItems.filter(x => !x).length;
  if (criticalMissing > 0) score -= criticalMissing * 15;

  return {
    status: getStatus(Math.max(0, score)),
    score: Math.max(0, score),
    keyFinding: completionRate < 0.5 
      ? `${total - completed} critical planning items incomplete`
      : completionRate < 0.8 
        ? 'Some planning gaps remain'
        : 'Financial plan is comprehensive',
    headlineMetric: `Planning: ${completed}/${total} complete`,
    details: { checklist, completed, total, completionRate },
  };
}

function generateRecommendations(analysis: Omit<PortfolioAnalysis, 'recommendations'>): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let priority = 1;

  const { diagnostics } = analysis;

  if (diagnostics.riskManagement.status === 'RED') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'riskManagement',
      priority: priority++,
      title: 'Reduce position concentration',
      description: 'Largest positions exceed 10% threshold',
      impact: 'Reduces single-stock risk by 30%',
    });
  }

  if (diagnostics.costAnalysis.status === 'RED' || diagnostics.costAnalysis.status === 'YELLOW') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'costAnalysis',
      priority: priority++,
      title: 'Switch to lower-cost funds',
      description: 'Replace high-fee active funds with index equivalents',
      impact: `Save $${((analysis.totalFees * 0.5)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/year`,
    });
  }

  const harvestable = diagnostics.taxEfficiency.details.totalHarvestable as number;
  if (harvestable > 0) {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'taxEfficiency',
      priority: priority++,
      title: 'Harvest tax losses',
      description: 'Realize losses to offset gains',
      impact: `Potential $${(diagnostics.taxEfficiency.details.estimatedTaxSavings as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} tax savings`,
    });
  }

  if (diagnostics.returnEfficiency.status !== 'GREEN') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'returnEfficiency',
      priority: priority++,
      title: 'Improve return efficiency',
      description: 'Replace underperforming holdings with efficient alternatives',
      impact: 'Improve Sharpe ratio by +0.1',
    });
  }

  if (diagnostics.diversification.status !== 'GREEN') {
    recommendations.push({
      id: `rec-${priority}`,
      category: 'diversification',
      priority: priority++,
      title: 'Improve diversification',
      description: 'Add exposure to underweighted asset classes',
      impact: 'Reduce portfolio correlation risk',
    });
  }

  return recommendations.slice(0, 5);
}

export function analyzePortfolio(
  holdings: Holding[],
  clientInfo: ClientInfo,
  planningChecklist: PlanningChecklist
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
        planningGaps: analyzePlanningGaps(planningChecklist),
      },
      recommendations: [],
    };
  }

  const diagnostics = {
    riskManagement: analyzeRiskManagement(holdings, clientInfo, metrics.totalValue, metrics.volatility),
    protection: analyzeProtection(holdings, metrics.totalValue),
    returnEfficiency: analyzeReturnEfficiency(holdings, metrics.totalValue, metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio),
    costAnalysis: analyzeCosts(holdings, metrics.totalValue, metrics.totalFees),
    taxEfficiency: analyzeTaxEfficiency(holdings, metrics.totalValue),
    diversification: analyzeDiversification(holdings, metrics.totalValue),
    riskAdjusted: analyzeRiskAdjusted(holdings, clientInfo, metrics.totalValue, metrics.expectedReturn, metrics.volatility),
    crisisResilience: analyzeCrisisResilience(holdings, metrics.totalValue),
    optimization: analyzeOptimization(metrics.expectedReturn, metrics.volatility, metrics.sharpeRatio, metrics.totalFees, metrics.totalValue),
    planningGaps: analyzePlanningGaps(planningChecklist),
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
