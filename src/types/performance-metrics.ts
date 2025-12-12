// Advanced Performance Metrics Types

export interface PerformanceMetrics {
  totalReturn: number;           // Total return as decimal (e.g., 0.248 = 24.8%)
  cagr: number;                  // Compound Annual Growth Rate
  calmarRatio: number;           // CAGR / Max Drawdown
  standardDeviation: number;     // Annual volatility (already exists, enhanced)
  beta: number;                  // Systematic risk vs market
  sharpeRatio: number;           // Risk-adjusted return (already exists, enhanced)
  expenseRatio: number;          // Weighted expense ratio (already exists, enhanced)
  maxDrawdown: number;           // Maximum peak-to-trough decline
  sortinoRatio: number;          // Downside risk-adjusted return
  lastUpdated: Date;
}

export interface MetricStatus {
  value: number;
  status: 'good' | 'warning' | 'poor';
  label: string;
  formattedValue: string;
}

export interface PerformanceMetricsConfig {
  totalReturn: { good: number; warning: number };
  cagr: { good: number; warning: number };
  calmarRatio: { good: number; warning: number };
  standardDeviation: {
    conservative: { good: number; bad: number };
    moderate: { good: number; bad: number };
    aggressive: { good: number; bad: number };
  };
  beta: {
    conservative: { good: number; bad: number };
    moderate: { good: number; bad: number };
    aggressive: { good: number; bad: number };
  };
  expenseRatio: { good: number; warning: number };
  maxDrawdown: { good: number; warning: number };
  sortinoRatio: { good: number; warning: number };
}

export const DEFAULT_METRICS_CONFIG: PerformanceMetricsConfig = {
  totalReturn: { good: 0.08, warning: 0.05 },
  cagr: { good: 0.08, warning: 0.05 },
  calmarRatio: { good: 0.5, warning: 0.25 },
  standardDeviation: {
    conservative: { good: 0.08, bad: 0.12 },
    moderate: { good: 0.12, bad: 0.18 },
    aggressive: { good: 0.18, bad: 0.25 },
  },
  beta: {
    conservative: { good: 0.8, bad: 1.1 },
    moderate: { good: 1.0, bad: 1.3 },
    aggressive: { good: 1.2, bad: 1.5 },
  },
  expenseRatio: { good: 0.005, warning: 0.015 },
  maxDrawdown: { good: -0.15, warning: -0.30 },
  sortinoRatio: { good: 0.8, warning: 0.4 },
};

// Consumer-friendly metric explanations
export interface MetricEducation {
  brief: string;      // 1 sentence, emoji-friendly
  detailed: string;   // 2-3 sentences, plain English
  technical: string;  // Advisor/technical audience
  whyItMatters: string;
  goodVsBad: string;
  howToImprove: string[];
}

export const METRIC_EDUCATION: Record<keyof PerformanceMetrics, MetricEducation> = {
  totalReturn: {
    brief: '📈 Your total investment gains over time.',
    detailed: 'Total Return measures how much your portfolio has grown in value, including both price appreciation and dividends. It shows your absolute gains.',
    technical: 'Cumulative return calculation: (Ending Value - Beginning Value) / Beginning Value, inclusive of reinvested dividends.',
    whyItMatters: 'This tells you if your money is actually growing. A positive total return means you\'re building wealth.',
    goodVsBad: '✓ Good: 8%+ annually. ⚠ Fair: 5-8%. ✗ Poor: <5%',
    howToImprove: [
      'Reduce fees that drag down returns',
      'Rebalance to capture gains',
      'Ensure adequate equity exposure for long-term growth',
    ],
  },
  cagr: {
    brief: '📊 Your average yearly growth rate.',
    detailed: 'CAGR (Compound Annual Growth Rate) smooths out your returns to show your consistent yearly growth rate, as if your money grew at a steady pace.',
    technical: 'CAGR = (Ending Value / Beginning Value)^(1/Years) - 1. Represents geometric mean annual return.',
    whyItMatters: 'CAGR helps you compare investments fairly and project future growth. It\'s more meaningful than simple average returns.',
    goodVsBad: '✓ Good: 8%+ CAGR. ⚠ Fair: 5-8%. ✗ Poor: <5%',
    howToImprove: [
      'Stay invested through market cycles',
      'Minimize taxes through tax-efficient placement',
      'Avoid frequent trading that creates drag',
    ],
  },
  calmarRatio: {
    brief: '🎯 How much return you get for the worst losses.',
    detailed: 'Calmar Ratio compares your annual returns to your worst drawdown. Higher is better—it means you\'re getting more return without taking big hits.',
    technical: 'Calmar Ratio = Annualized Return / |Max Drawdown|. Measures return efficiency relative to downside risk.',
    whyItMatters: 'This shows if you\'re being compensated for the pain of losses. A high Calmar means smooth growth.',
    goodVsBad: '✓ Good: 0.5+. ⚠ Fair: 0.25-0.5. ✗ Poor: <0.25',
    howToImprove: [
      'Add defensive assets to reduce drawdowns',
      'Diversify across uncorrelated assets',
      'Consider downside protection strategies',
    ],
  },
  standardDeviation: {
    brief: '📉 How much your portfolio bounces around.',
    detailed: 'Standard Deviation measures volatility—how much your returns vary from the average. Lower volatility means a smoother ride.',
    technical: 'Annualized standard deviation of periodic returns. Represents one sigma of expected return distribution.',
    whyItMatters: 'High volatility can cause panic selling and sleep loss. Match volatility to your comfort level.',
    goodVsBad: 'Depends on risk tolerance. Conservative: <12%. Moderate: <18%. Aggressive: <25%.',
    howToImprove: [
      'Add bonds to reduce overall volatility',
      'Diversify across asset classes',
      'Avoid concentrated positions',
    ],
  },
  beta: {
    brief: '⚖️ How your portfolio moves vs the market.',
    detailed: 'Beta shows how sensitive your portfolio is to market swings. Beta of 1.0 = moves with the market. Higher = more volatile than market.',
    technical: 'Beta = Covariance(Portfolio, Market) / Variance(Market). Measures systematic risk exposure.',
    whyItMatters: 'Understanding beta helps you know how your portfolio will react when markets drop.',
    goodVsBad: 'Conservative: <0.8. Moderate: ~1.0. Aggressive: 1.0-1.2.',
    howToImprove: [
      'Add low-beta assets (bonds, utilities)',
      'Reduce growth stock concentration',
      'Consider defensive sectors',
    ],
  },
  sharpeRatio: {
    brief: '💪 Your returns per unit of risk taken.',
    detailed: 'Sharpe Ratio measures how much extra return you\'re getting for the volatility you\'re accepting. Higher is better—more bang for your buck.',
    technical: 'Sharpe = (Portfolio Return - Risk Free Rate) / Standard Deviation. Risk-adjusted performance metric.',
    whyItMatters: 'A higher Sharpe means you\'re being well-compensated for the risks you\'re taking.',
    goodVsBad: '✓ Good: 0.5+. ⚠ Fair: 0.35-0.5. ✗ Poor: <0.35',
    howToImprove: [
      'Replace inefficient holdings',
      'Reduce fees that drag down returns',
      'Optimize asset allocation',
    ],
  },
  expenseRatio: {
    brief: '💸 Annual fees eating into your returns.',
    detailed: 'Expense Ratio is the percentage of your portfolio paid in fees each year. Over time, high fees can cost you tens of thousands.',
    technical: 'Weighted average expense ratio across all holdings, including fund fees and advisor costs.',
    whyItMatters: 'Every 0.1% in fees costs you ~$50k over 30 years on a $500k portfolio. Fees compound against you.',
    goodVsBad: '✓ Good: <0.5%. ⚠ Fair: 0.5-1.5%. ✗ Poor: >1.5%',
    howToImprove: [
      'Switch to low-cost index funds',
      'Avoid actively managed funds with high turnover',
      'Negotiate advisor fees',
    ],
  },
  maxDrawdown: {
    brief: '📉 Your worst peak-to-bottom drop.',
    detailed: 'Max Drawdown shows the biggest loss from a high point to a low point. It tells you the worst you could have experienced.',
    technical: 'Maximum observed loss from peak to trough before new peak. Measures tail risk.',
    whyItMatters: 'This is the real pain you might feel. Can you stomach a 30% drop without selling?',
    goodVsBad: '✓ Good: <15%. ⚠ Fair: 15-30%. ✗ Poor: >30%',
    howToImprove: [
      'Diversify across uncorrelated assets',
      'Add defensive positions',
      'Maintain cash reserves',
    ],
  },
  sortinoRatio: {
    brief: '🎯 Returns vs downside risk only.',
    detailed: 'Sortino Ratio is like Sharpe but only counts bad volatility (losses). It rewards upside volatility and penalizes downside.',
    technical: 'Sortino = (Portfolio Return - Risk Free Rate) / Downside Deviation. Focuses on harmful volatility.',
    whyItMatters: 'Upside volatility is good! Sortino tells you if your risk is mostly on the downside.',
    goodVsBad: '✓ Good: 0.8+. ⚠ Fair: 0.4-0.8. ✗ Poor: <0.4',
    howToImprove: [
      'Add asymmetric return profiles',
      'Consider options strategies for downside protection',
      'Reduce correlation to market downturns',
    ],
  },
  lastUpdated: {
    brief: '',
    detailed: '',
    technical: '',
    whyItMatters: '',
    goodVsBad: '',
    howToImprove: [],
  },
};
