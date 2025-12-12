// src/domain/content/cardCopy.ts
// Central source of truth for card display copy

export type CardCopy = {
  title: string;
  subtitle?: string;
  shortLabel?: string;
  educationBlurb?: string;
};

export const CARD_COPY: Record<string, CardCopy> = {
  riskDiversification: {
    title: "Diversification Check",
    subtitle: "Are you too concentrated in one stock, fund, or sector?",
  },
  downsideResilience: {
    title: "Market Drop Risk",
    subtitle: "How much could your portfolio fall in a bad market?",
  },
  performanceOptimization: {
    title: "Performance vs Benchmark",
    subtitle: "Are you keeping up with the market for your risk level?",
  },
  costAnalysis: {
    title: "Fees & Fund Costs",
    subtitle: "How much fees may be quietly costing you",
  },
  taxEfficiency: {
    title: "Tax Efficiency",
    subtitle: "Are you paying more taxes than you need to?",
  },
  riskAdjusted: {
    title: "Risk vs Return",
    subtitle: "Are you being rewarded for the risk you're taking?",
  },
  planningGaps: {
    title: "Planning Checklist",
    subtitle: "Common money basics that protect your plan",
  },
  lifetimeIncomeSecurity: {
    title: "Retirement Readiness",
    subtitle: "Will your assets support your spending for life?",
  },
  performanceMetrics: {
    title: "Performance Details",
    subtitle: "Returns, volatility, and drawdowns in one place",
  },
  summary: {
    title: "Your Portfolio Snapshot",
    subtitle: "Biggest risks first, then quick wins",
  },
};
