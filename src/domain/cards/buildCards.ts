// src/domain/cards/buildCards.ts
import type { PortfolioAnalysis, Recommendation } from "@/types/portfolio";
import type { CardContract, CardAction } from "./types";
import { computeSeverity } from "./severityPolicy";

const TITLE_MAP: Record<CardContract["id"], string> = {
  riskDiversification: "Diversification & Concentration",
  downsideResilience: "Downside Resilience",
  performanceOptimization: "Performance vs Market",
  costAnalysis: "Fees & Expense Drag",
  taxEfficiency: "Tax Efficiency",
  riskAdjusted: "Risk-Adjusted Performance",
  planningGaps: "Planning Gaps",
  lifetimeIncomeSecurity: "Lifetime Income Security",
  performanceMetrics: "Performance Metrics",
  summary: "Summary",
};

const ICON_MAP: Partial<Record<CardContract["id"], string>> = {
  riskDiversification: "PieChart",
  downsideResilience: "ShieldAlert",
  performanceOptimization: "TrendingUp",
  costAnalysis: "Percent",
  taxEfficiency: "Receipt",
  riskAdjusted: "Activity",
  planningGaps: "ClipboardList",
  lifetimeIncomeSecurity: "Wallet",
  performanceMetrics: "BarChart",
};


function defaultActionsFor(id: CardContract["id"]): CardAction[] {
  switch (id) {
    case "riskDiversification":
      return [{ label: "Review concentration & allocation", kind: "DIVERSIFY", deepLink: "/portfolio" }];
    case "downsideResilience":
      return [{ label: "Stress test and reduce tail risk", kind: "RISK_REDUCE", deepLink: "/portfolio" }];
    case "performanceOptimization":
      return [{ label: "Compare performance vs benchmark", kind: "BENCHMARK", deepLink: "/dashboard" }];
    case "costAnalysis":
      return [{ label: "Find high-fee holdings", kind: "REDUCE_FEES", deepLink: "/holdings" }];
    case "taxEfficiency":
      return [{ label: "Improve tax location and harvesting", kind: "TAX_OPTIMIZE", deepLink: "/advisor" }];
    case "riskAdjusted":
      return [{ label: "Improve risk-adjusted returns", kind: "RISK_REDUCE", deepLink: "/dashboard" }];
    case "planningGaps":
      return [{ label: "Close planning checklist gaps", kind: "LEARN", deepLink: "/planning" }];
    case "lifetimeIncomeSecurity":
      return [{ label: "Review income coverage", kind: "LEARN", deepLink: "/income" }];
    case "performanceMetrics":
      return [{ label: "Review performance metrics detail", kind: "BENCHMARK", deepLink: "/dashboard" }];
    default:
      return [{ label: "Learn more", kind: "LEARN" }];
  }
}

const WHY: Partial<Record<CardContract["id"], string>> = {
  riskDiversification:
    "Diversification reduces single-point failure risk and helps your portfolio survive shocks without forcing bad decisions.",
  downsideResilience:
    "Downside resilience matters because drawdowns create the biggest behavioral risk: selling at the bottom.",
  performanceOptimization:
    "Performance optimization checks whether results are explained by market exposure or driven by portfolio choices.",
  costAnalysis:
    "Fees compound negatively. Reducing expense drag is one of the few reliable ways to improve net returns.",
  taxEfficiency:
    "Tax efficiency improves after-tax outcomes, especially in taxable accounts, without changing market risk.",
  riskAdjusted:
    "Risk-adjusted metrics evaluate whether returns were earned efficiently given the volatility you experienced.",
  planningGaps:
    "Planning gaps increase the chance that a life event becomes a financial event. Closing them reduces fragility.",
  lifetimeIncomeSecurity:
    "Income coverage determines whether your plan can fund core expenses through market cycles and longevity.",
  performanceMetrics:
    "Metrics like Sharpe and drawdown help you compare strategies on a consistent, risk-aware basis.",
};

export function buildCardContracts(analysis: PortfolioAnalysis): CardContract[] {
  const cards: CardContract[] = [];

  (Object.keys(analysis.diagnostics) as Array<keyof PortfolioAnalysis["diagnostics"]>).forEach((id) => {
    const r = analysis.diagnostics[id];

    // Pull any recommendations belonging to this diagnostic category
    const recs: Recommendation[] = (analysis.recommendations || []).filter((x) => x.category === id);

    cards.push({
      id,
      title: TITLE_MAP[id] ?? String(id),
      iconName: ICON_MAP[id],
      whyItMatters: WHY[id] ?? "This diagnostic highlights a portfolio health dimension.",
      status: r.status,
      score: r.score,
      keyFinding: r.keyFinding,
      headlineMetric: r.headlineMetric,
      details: r.details,
      severity: computeSeverity({ id, status: r.status, score: r.score, details: r.details }),
      recommendations: recs,
      actions: defaultActionsFor(id),
    });
  });

  return cards;
}
