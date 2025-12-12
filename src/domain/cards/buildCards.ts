// src/domain/cards/buildCards.ts
import type { PortfolioAnalysis, Recommendation, Holding } from "@/types/portfolio";
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

type AccountBucket = "Brokerage" | "Traditional IRA" | "Roth IRA" | "Unknown";

function inferAccountBucket(holding: Holding): AccountBucket {
  const name = (holding.name || "").toLowerCase();
  
  if (holding.accountType === "Taxable") {
    return "Brokerage";
  }
  
  // Tax-Advantaged: check name for Roth vs Traditional
  if (name.includes("roth")) {
    return "Roth IRA";
  }
  if (name.includes("trad ira") || name.includes("traditional") || name.includes("[trad ira]")) {
    return "Traditional IRA";
  }
  // Default Tax-Advantaged to Traditional IRA
  return "Traditional IRA";
}

interface AccountMetrics {
  bucket: AccountBucket;
  totalValue: number;
  topHoldingPct: number;
  weightedExpenseRatio: number;
  holdings: Holding[];
}

function computeAccountMetrics(holdings: Holding[]): AccountMetrics[] {
  const buckets: Record<AccountBucket, Holding[]> = {
    "Brokerage": [],
    "Traditional IRA": [],
    "Roth IRA": [],
    "Unknown": [],
  };

  holdings.forEach(h => {
    const bucket = inferAccountBucket(h);
    buckets[bucket].push(h);
  });

  return (Object.keys(buckets) as AccountBucket[])
    .filter(bucket => buckets[bucket].length > 0)
    .map(bucket => {
      const acctHoldings = buckets[bucket];
      const totalValue = acctHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
      
      // Top holding percentage
      const holdingValues = acctHoldings.map(h => h.shares * h.currentPrice);
      const topHoldingValue = Math.max(...holdingValues, 0);
      const topHoldingPct = totalValue > 0 ? (topHoldingValue / totalValue) * 100 : 0;
      
      // Weighted expense ratio
      let weightedER = 0;
      if (totalValue > 0) {
        acctHoldings.forEach(h => {
          const value = h.shares * h.currentPrice;
          const er = h.expenseRatio ?? 0;
          weightedER += (value / totalValue) * er;
        });
      }

      return {
        bucket,
        totalValue,
        topHoldingPct,
        weightedExpenseRatio: weightedER,
        holdings: acctHoldings,
      };
    });
}

function getAccountContextForDiagnostic(
  id: CardContract["id"],
  holdings: Holding[],
  status: string
): string | undefined {
  // Only add context for holdings-related diagnostics with issues
  if (status === "GREEN" || holdings.length === 0) return undefined;

  const accountMetrics = computeAccountMetrics(holdings);
  if (accountMetrics.length <= 1) return undefined; // No point if single account

  switch (id) {
    case "riskDiversification": {
      // Find account with highest concentration (top holding %)
      const sorted = [...accountMetrics].sort((a, b) => b.topHoldingPct - a.topHoldingPct);
      const worst = sorted[0];
      if (worst && worst.topHoldingPct > 10) {
        return worst.bucket;
      }
      break;
    }
    case "costAnalysis": {
      // Find account with highest weighted expense ratio
      const sorted = [...accountMetrics].sort((a, b) => b.weightedExpenseRatio - a.weightedExpenseRatio);
      const worst = sorted[0];
      if (worst && worst.weightedExpenseRatio > 0.002) { // > 0.2%
        return worst.bucket;
      }
      break;
    }
    case "taxEfficiency": {
      // Prioritize Brokerage (taxable) since that's where tax efficiency matters most
      const brokerage = accountMetrics.find(a => a.bucket === "Brokerage");
      if (brokerage && brokerage.holdings.length > 0) {
        return "Brokerage";
      }
      break;
    }
  }

  return undefined;
}

export function buildCardContracts(analysis: PortfolioAnalysis, holdings: Holding[] = []): CardContract[] {
  const cards: CardContract[] = [];

  (Object.keys(analysis.diagnostics) as Array<keyof PortfolioAnalysis["diagnostics"]>).forEach((id) => {
    const r = analysis.diagnostics[id];

    // Pull any recommendations belonging to this diagnostic category
    const recs: Recommendation[] = (analysis.recommendations || []).filter((x) => x.category === id);

    // Compute account-aware context
    const contextLabel = getAccountContextForDiagnostic(id, holdings, r.status);

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
      contextLabel,
      severity: computeSeverity({ id, status: r.status, score: r.score, details: r.details }),
      recommendations: recs,
      actions: defaultActionsFor(id),
    });
  });

  return cards;
}
