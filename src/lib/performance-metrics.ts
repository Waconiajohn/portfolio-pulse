// Advanced Performance Metrics Calculations

import { Holding, RiskTolerance } from '@/types/portfolio';
import { PerformanceMetrics, DEFAULT_METRICS_CONFIG, MetricStatus } from '@/types/performance-metrics';
import { EXPECTED_RETURNS, VOLATILITY, DEFAULT_EXPENSE_RATIOS, RISK_FREE_RATE } from './constants';

// ============================================================================
// HELPER: Calculate variance
// ============================================================================
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

// ============================================================================
// HELPER: Calculate covariance
// ============================================================================
function calculateCovariance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;
  const mean1 = arr1.reduce((a, b) => a + b, 0) / arr1.length;
  const mean2 = arr2.reduce((a, b) => a + b, 0) / arr2.length;
  return arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0) / arr1.length;
}

// ============================================================================
// 1. TOTAL RETURN (Absolute Gain %)
// ============================================================================
export function calculateTotalReturn(holdings: Holding[]): number {
  const beginningValue = holdings.reduce(
    (sum, h) => sum + h.costBasis * h.shares,
    0
  );
  const endingValue = holdings.reduce(
    (sum, h) => sum + h.currentPrice * h.shares,
    0
  );
  
  if (beginningValue === 0) return 0;
  return (endingValue - beginningValue) / beginningValue;
}

// ============================================================================
// 2. CAGR (Compound Annual Growth Rate)
// ============================================================================
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  years: number
): number {
  if (beginningValue <= 0 || years <= 0) return 0;
  return Math.pow(endingValue / beginningValue, 1 / years) - 1;
}

// ============================================================================
// 3. MAX DRAWDOWN
// ============================================================================
export function calculateMaxDrawdown(priceHistory: number[]): number {
  if (priceHistory.length < 2) return 0;
  
  let peakValue = priceHistory[0];
  let maxDrawdown = 0;

  for (const price of priceHistory) {
    if (price > peakValue) peakValue = price;
    const drawdown = (price - peakValue) / peakValue;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  
  return maxDrawdown; // Returns negative value
}

// ============================================================================
// 4. CALMAR RATIO
// ============================================================================
export function calculateCalmarRatio(annualReturn: number, maxDrawdown: number): number {
  if (maxDrawdown >= 0) return 0;
  return annualReturn / Math.abs(maxDrawdown);
}

// ============================================================================
// 5. STANDARD DEVIATION (Volatility)
// ============================================================================
export function calculateStandardDeviation(returns: number[]): number {
  if (returns.length === 0) return 0;
  const variance = calculateVariance(returns);
  return Math.sqrt(variance);
}

// ============================================================================
// 6. BETA (Systematic Risk vs Market)
// ============================================================================
export function calculateBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) {
    return 1.0; // Default to market beta
  }
  
  const covariance = calculateCovariance(portfolioReturns, benchmarkReturns);
  const benchmarkVariance = calculateVariance(benchmarkReturns);
  
  if (benchmarkVariance === 0) return 1.0;
  return covariance / benchmarkVariance;
}

// ============================================================================
// 7. SHARPE RATIO (Enhanced)
// ============================================================================
export function calculateSharpeRatio(
  expectedReturn: number,
  volatility: number,
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (volatility === 0) return 0;
  return (expectedReturn - riskFreeRate) / volatility;
}

// ============================================================================
// 8. SORTINO RATIO
// ============================================================================
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = RISK_FREE_RATE
): number {
  if (returns.length === 0) return 0;
  
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  
  // Calculate downside deviation (only negative returns)
  const downsideReturns = returns.filter(r => r < riskFreeRate);
  if (downsideReturns.length === 0) return 2.0; // Excellent - no downside
  
  const downsideVariance = downsideReturns.reduce(
    (sum, r) => sum + Math.pow(r - riskFreeRate, 2),
    0
  ) / downsideReturns.length;
  
  const downsideDeviation = Math.sqrt(downsideVariance);
  if (downsideDeviation === 0) return 2.0;
  
  return (meanReturn - riskFreeRate) / downsideDeviation;
}

// ============================================================================
// 9. WEIGHTED EXPENSE RATIO
// ============================================================================
export function calculateWeightedExpenseRatio(holdings: Holding[]): number {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  
  if (totalValue === 0) return 0;
  
  return holdings.reduce((sum, h) => {
    const weight = (h.currentPrice * h.shares) / totalValue;
    const expenseRatio = h.expenseRatio ?? DEFAULT_EXPENSE_RATIOS.etf;
    return sum + weight * expenseRatio;
  }, 0);
}

// ============================================================================
// SIMULATE HISTORICAL RETURNS (for metrics that need return history)
// ============================================================================
function simulateHistoricalReturns(holdings: Holding[], periods: number = 36): {
  portfolioReturns: number[];
  benchmarkReturns: number[];
  priceHistory: number[];
} {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  if (totalValue === 0) {
    return { portfolioReturns: [], benchmarkReturns: [], priceHistory: [] };
  }

  // Calculate weighted portfolio characteristics
  let weightedReturn = 0;
  let weightedVol = 0;
  
  holdings.forEach(h => {
    const weight = (h.shares * h.currentPrice) / totalValue;
    weightedReturn += weight * (EXPECTED_RETURNS[h.assetClass] || 0.06);
    weightedVol += weight * (VOLATILITY[h.assetClass] || 0.12);
  });

  const monthlyReturn = weightedReturn / 12;
  const monthlyVol = weightedVol / Math.sqrt(12);
  
  // Benchmark (S&P 500-like)
  const benchmarkMonthlyReturn = 0.08 / 12;
  const benchmarkMonthlyVol = 0.15 / Math.sqrt(12);
  
  const portfolioReturns: number[] = [];
  const benchmarkReturns: number[] = [];
  const priceHistory: number[] = [totalValue];
  
  let currentValue = totalValue;
  
  for (let i = 0; i < periods; i++) {
    // Simulate returns with some correlation and randomness
    const randomFactor = (Math.random() - 0.5) * 2;
    const marketShock = (Math.random() - 0.5) * 2;
    
    const portfolioReturn = monthlyReturn + monthlyVol * randomFactor * 0.8 + 
                           monthlyVol * marketShock * 0.2;
    const benchmarkReturn = benchmarkMonthlyReturn + benchmarkMonthlyVol * marketShock;
    
    portfolioReturns.push(portfolioReturn);
    benchmarkReturns.push(benchmarkReturn);
    
    currentValue = currentValue * (1 + portfolioReturn);
    priceHistory.push(currentValue);
  }
  
  return { portfolioReturns, benchmarkReturns, priceHistory };
}

// ============================================================================
// CALCULATE ALL PERFORMANCE METRICS
// ============================================================================
export function calculateAllPerformanceMetrics(
  holdings: Holding[],
  yearsHeld: number = 3
): PerformanceMetrics {
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.costBasis * h.shares, 0);
  
  // Simulate historical data
  const { portfolioReturns, benchmarkReturns, priceHistory } = simulateHistoricalReturns(holdings);
  
  // Calculate base metrics
  const totalReturn = calculateTotalReturn(holdings);
  const cagr = calculateCAGR(totalCost, totalValue, yearsHeld);
  const maxDrawdown = calculateMaxDrawdown(priceHistory);
  const calmarRatio = calculateCalmarRatio(cagr, maxDrawdown);
  
  // Calculate volatility from simulated returns
  const annualizedReturns = portfolioReturns.map(r => r * 12);
  const standardDeviation = calculateStandardDeviation(annualizedReturns) || 
                           holdings.reduce((sum, h) => {
                             const weight = (h.shares * h.currentPrice) / (totalValue || 1);
                             return sum + weight * (VOLATILITY[h.assetClass] || 0.12);
                           }, 0);
  
  // Calculate beta
  const beta = calculateBeta(portfolioReturns, benchmarkReturns);
  
  // Calculate expected return for Sharpe
  const expectedReturn = holdings.reduce((sum, h) => {
    const weight = (h.shares * h.currentPrice) / (totalValue || 1);
    return sum + weight * (EXPECTED_RETURNS[h.assetClass] || 0.06);
  }, 0);
  
  const sharpeRatio = calculateSharpeRatio(expectedReturn, standardDeviation);
  const sortinoRatio = calculateSortinoRatio(portfolioReturns);
  const expenseRatio = calculateWeightedExpenseRatio(holdings);
  
  return {
    totalReturn,
    cagr,
    calmarRatio,
    standardDeviation,
    beta,
    sharpeRatio,
    expenseRatio,
    maxDrawdown,
    sortinoRatio,
    lastUpdated: new Date(),
  };
}

// ============================================================================
// GET METRIC STATUS
// ============================================================================
export function getMetricStatus(
  metricName: keyof PerformanceMetrics,
  value: number,
  riskTolerance: RiskTolerance = 'Moderate',
  config = DEFAULT_METRICS_CONFIG
): MetricStatus {
  let status: 'good' | 'warning' | 'poor' = 'warning';
  let label = 'Fair';
  let formattedValue = '';

  switch (metricName) {
    case 'totalReturn':
    case 'cagr':
      formattedValue = `${(value * 100).toFixed(1)}%`;
      if (value >= config.cagr.good) { status = 'good'; label = 'Good'; }
      else if (value >= config.cagr.warning) { status = 'warning'; label = 'Fair'; }
      else { status = 'poor'; label = 'Low'; }
      break;
      
    case 'calmarRatio':
      formattedValue = value.toFixed(2);
      if (value >= config.calmarRatio.good) { status = 'good'; label = 'Strong'; }
      else if (value >= config.calmarRatio.warning) { status = 'warning'; label = 'Fair'; }
      else { status = 'poor'; label = 'Weak'; }
      break;
      
    case 'standardDeviation':
      formattedValue = `${(value * 100).toFixed(1)}%`;
      const volThresholds = config.standardDeviation[riskTolerance.toLowerCase() as 'conservative' | 'moderate' | 'aggressive'];
      if (value <= volThresholds.good) { status = 'good'; label = 'On Target'; }
      else if (value <= volThresholds.bad) { status = 'warning'; label = 'Elevated'; }
      else { status = 'poor'; label = 'High'; }
      break;
      
    case 'beta':
      formattedValue = value.toFixed(2);
      const betaThresholds = config.beta[riskTolerance.toLowerCase() as 'conservative' | 'moderate' | 'aggressive'];
      if (value <= betaThresholds.good) { status = 'good'; label = 'Appropriate'; }
      else if (value <= betaThresholds.bad) { status = 'warning'; label = 'Elevated'; }
      else { status = 'poor'; label = 'High'; }
      break;
      
    case 'sharpeRatio':
      formattedValue = value.toFixed(2);
      if (value >= 0.5) { status = 'good'; label = 'Good'; }
      else if (value >= 0.35) { status = 'warning'; label = 'Fair'; }
      else { status = 'poor'; label = 'Low'; }
      break;
      
    case 'sortinoRatio':
      formattedValue = value.toFixed(2);
      if (value >= config.sortinoRatio.good) { status = 'good'; label = 'Strong'; }
      else if (value >= config.sortinoRatio.warning) { status = 'warning'; label = 'Fair'; }
      else { status = 'poor'; label = 'Weak'; }
      break;
      
    case 'expenseRatio':
      formattedValue = `${(value * 100).toFixed(2)}%`;
      if (value <= config.expenseRatio.good) { status = 'good'; label = 'Low'; }
      else if (value <= config.expenseRatio.warning) { status = 'warning'; label = 'Moderate'; }
      else { status = 'poor'; label = 'High'; }
      break;
      
    case 'maxDrawdown':
      formattedValue = `${(value * 100).toFixed(1)}%`;
      if (value >= config.maxDrawdown.good) { status = 'good'; label = 'Mild'; }
      else if (value >= config.maxDrawdown.warning) { status = 'warning'; label = 'Moderate'; }
      else { status = 'poor'; label = 'Severe'; }
      break;
      
    default:
      formattedValue = String(value);
  }

  return { value, status, label, formattedValue };
}
