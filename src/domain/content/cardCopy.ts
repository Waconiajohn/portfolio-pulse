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
    title: "Portfolio Concentration",
    subtitle: "How spread out your investments really are",
  },
  downsideResilience: {
    title: "Market Drop Protection",
    subtitle: "How your portfolio may behave in a downturn",
  },
  performanceOptimization: {
    title: "Return Efficiency",
    subtitle: "Are you getting enough return for the risk?",
  },
  costAnalysis: {
    title: "Investment Fees",
    subtitle: "Hidden costs reducing long-term growth",
  },
  taxEfficiency: {
    title: "Tax Drag",
    subtitle: "How taxes may be reducing returns",
  },
  riskAdjusted: {
    title: "Risk vs Reward Balance",
    subtitle: "Is your risk paying off?",
  },
  planningGaps: {
    title: "Planning Gaps",
    subtitle: "Important items that may be missing",
  },
  lifetimeIncomeSecurity: {
    title: "Retirement Income Confidence",
    subtitle: "How secure your long-term income may be",
  },
  performanceMetrics: {
    title: "Portfolio Performance",
    subtitle: "How your investments are performing overall",
  },
  crossAccountConcentration: {
    title: "Cross-Account Risk",
    subtitle: "Hidden overlap across all your accounts",
  },
};
