// Correlation calculation module for portfolio holdings

export type CorrelationMatrixResult = {
  labels: string[];
  matrix: number[][];
};

export type ReturnsBySymbol = Record<string, number[]>;

/**
 * Compute the correlation matrix from aligned arrays of historical returns per holding
 */
export function computeCorrelationMatrix(input: ReturnsBySymbol): CorrelationMatrixResult {
  const symbols = Object.keys(input);
  const n = symbols.length;
  if (n === 0) return { labels: [], matrix: [] };

  const m = input[symbols[0]]?.length || 0;
  if (m === 0) return { labels: symbols, matrix: Array.from({ length: n }, () => Array(n).fill(1)) };

  // Calculate means
  const means: Record<string, number> = {};
  for (const s of symbols) {
    const arr = input[s];
    const len = Math.min(m, arr.length);
    const sum = arr.slice(0, len).reduce((a, b) => a + b, 0);
    means[s] = len > 0 ? sum / len : 0;
  }

  // Calculate standard deviations
  const stdDev: Record<string, number> = {};
  for (const s of symbols) {
    const arr = input[s];
    const len = Math.min(m, arr.length);
    const mean = means[s];
    const variance =
      len > 1
        ? arr.slice(0, len).reduce((sum, x) => sum + (x - mean) * (x - mean), 0) / (len - 1)
        : 0;
    stdDev[s] = Math.sqrt(variance) || 0.000001; // avoid divide by zero
  }

  // Build correlation matrix
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }
      const si = symbols[i];
      const sj = symbols[j];
      const ri = input[si];
      const rj = input[sj];
      const len = Math.min(ri.length, rj.length, m);
      const meanI = means[si];
      const meanJ = means[sj];

      let cov = 0;
      for (let t = 0; t < len; t++) {
        cov += (ri[t] - meanI) * (rj[t] - meanJ);
      }
      cov = len > 1 ? cov / (len - 1) : 0;

      matrix[i][j] = cov / (stdDev[si] * stdDev[sj]);
    }
  }

  return { labels: symbols, matrix };
}

/**
 * Generate simulated returns for holdings based on asset class characteristics
 * In production, this would use real historical data
 */
export function generateSimulatedReturns(
  holdings: Array<{ ticker: string; assetClass: string }>,
  periods: number = 60
): ReturnsBySymbol {
  const returnsBySymbol: ReturnsBySymbol = {};
  
  // Asset class expected monthly returns and volatilities
  const assetClassParams: Record<string, { meanReturn: number; volatility: number; marketCorr: number }> = {
    'US Stocks': { meanReturn: 0.008, volatility: 0.045, marketCorr: 0.85 },
    'Intl Stocks': { meanReturn: 0.007, volatility: 0.055, marketCorr: 0.75 },
    'Bonds': { meanReturn: 0.003, volatility: 0.015, marketCorr: -0.1 },
    'Commodities': { meanReturn: 0.004, volatility: 0.05, marketCorr: 0.3 },
    'Cash': { meanReturn: 0.002, volatility: 0.001, marketCorr: 0.0 },
    'Other': { meanReturn: 0.005, volatility: 0.04, marketCorr: 0.5 },
  };

  // Generate common market factor
  const marketReturns: number[] = [];
  for (let i = 0; i < periods; i++) {
    marketReturns.push(gaussianRandom(0.007, 0.04));
  }

  // Generate returns for each holding
  for (const holding of holdings) {
    const params = assetClassParams[holding.assetClass] || assetClassParams['Other'];
    const returns: number[] = [];
    
    // Add some ticker-specific noise seed for variation
    const tickerSeed = holding.ticker.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) / 1000;
    
    for (let i = 0; i < periods; i++) {
      // Combine market factor with idiosyncratic return
      const marketComponent = params.marketCorr * marketReturns[i];
      const idiosyncratic = gaussianRandom(
        params.meanReturn * (1 - Math.abs(params.marketCorr)),
        params.volatility * Math.sqrt(1 - params.marketCorr * params.marketCorr)
      );
      // Add small ticker-specific variation
      const tickerNoise = Math.sin(i * tickerSeed) * 0.005;
      returns.push(marketComponent + idiosyncratic + tickerNoise);
    }
    
    returnsBySymbol[holding.ticker] = returns;
  }

  return returnsBySymbol;
}

/**
 * Box-Muller transform for normally distributed random numbers
 */
function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stdDev + mean;
}

/**
 * Analyze correlation issues in a portfolio
 */
export function analyzeCorrelationIssues(matrix: number[][], labels: string[]): {
  hasIssues: boolean;
  highCorrelations: Array<{ pair: [string, string]; correlation: number }>;
  avgCorrelation: number;
} {
  const highCorrelations: Array<{ pair: [string, string]; correlation: number }> = [];
  let totalCorr = 0;
  let count = 0;

  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const corr = matrix[i][j];
      totalCorr += Math.abs(corr);
      count++;
      
      if (corr > 0.7) {
        highCorrelations.push({
          pair: [labels[i], labels[j]],
          correlation: corr,
        });
      }
    }
  }

  const avgCorrelation = count > 0 ? totalCorr / count : 0;

  return {
    hasIssues: highCorrelations.length > 0 || avgCorrelation > 0.5,
    highCorrelations: highCorrelations.sort((a, b) => b.correlation - a.correlation),
    avgCorrelation,
  };
}
