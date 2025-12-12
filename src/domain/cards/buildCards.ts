// src/domain/cards/buildCards.ts
import type { PortfolioAnalysis, Recommendation, Holding } from "@/types/portfolio";
import type { CardContract, CardAction } from "./types";
import { computeSeverity } from "./severityPolicy";
import { inferAccountSubtype, type AccountBucket } from "@/domain/accounts/inferAccountSubtype";
import { CARD_COPY } from "@/domain/content/cardCopy";
import { formatPct, formatCurrency, sentenceCase } from "@/domain/content/copyHelpers";

// Fallback titles if not found in CARD_COPY
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

// Consumer-friendly "why this matters" explanations
const WHY: Partial<Record<CardContract["id"], string>> = {
  riskDiversification:
    "Spreading your money across different investments helps protect you if one drops sharply.",
  downsideResilience:
    "Understanding how much you could lose in a bad market helps you avoid panic-selling at the worst time.",
  performanceOptimization:
    "Comparing your returns to the market shows whether your investments are working as hard as they could.",
  costAnalysis:
    "Investment fees add up over time. Even small reductions can mean thousands more in your pocket.",
  taxEfficiency:
    "Keeping more of what you earn by reducing unnecessary taxes is one of the easiest wins in investing.",
  riskAdjusted:
    "This checks if the ups and downs you're experiencing are worth the returns you're getting.",
  planningGaps:
    "Having basics like an emergency fund and insurance in place protects your investments from life surprises.",
  lifetimeIncomeSecurity:
    "Knowing your retirement income is secure lets you enjoy your savings without worry.",
  performanceMetrics:
    "These numbers help you understand your portfolio's behavior in a consistent, comparable way.",
};

/**
 * Generate consumer-friendly keyFinding text based on diagnostic details
 * Rules: No ALL CAPS, no jargon, 1-2 sentences max
 */
function consumerKeyFinding(
  id: CardContract["id"],
  originalKeyFinding: string,
  details: Record<string, unknown>,
  status: string
): string {
  switch (id) {
    case "riskDiversification": {
      const topPositions = details.topPositions as Array<{ ticker: string; weight: number }> | undefined;
      const topWeight = topPositions?.[0]?.weight ?? 0;
      const topTicker = topPositions?.[0]?.ticker ?? "one holding";
      const top3Weight = (details.top3Weight as number) ?? 0;
      
      if (topWeight > 0.15) {
        return `Your largest holding (${topTicker}) is ${formatPct(topWeight)} of your portfolio. If it drops sharply, it could significantly impact your wealth.`;
      } else if (top3Weight > 0.5) {
        return `Your top 3 holdings make up ${formatPct(top3Weight)} of your portfolio. Spreading things out more could reduce your risk.`;
      } else if (status === "GREEN") {
        return `Your investments are well spread out, with no single holding dominating your portfolio.`;
      }
      return `Your portfolio has some concentration that could increase risk if certain investments drop.`;
    }

    case "downsideResilience": {
      const avgImpact = (details.avgImpact as number) ?? -0.3;
      const criticalCount = (details.criticalCount as number) ?? 0;
      const impactPct = Math.abs(avgImpact);
      
      if (criticalCount >= 2) {
        return `In a market downturn, your portfolio could fall about ${formatPct(impactPct, 0)}. You have some significant vulnerabilities to address.`;
      } else if (impactPct > 0.35) {
        return `In a bad market, your portfolio could drop around ${formatPct(impactPct, 0)}. That's a bigger swing than average—make sure you're comfortable with that.`;
      } else if (status === "GREEN") {
        return `Your portfolio is built to handle market drops reasonably well, with expected losses around ${formatPct(impactPct, 0)} in downturns.`;
      }
      return `In a market drop, your portfolio could fall about ${formatPct(impactPct, 0)}. Consider whether that level of volatility fits your comfort level.`;
    }

    case "costAnalysis": {
      const allInFees = (details.allInFees as number) ?? 0;
      const tenYearImpact = (details.tenYearImpact as number) ?? 0;
      const modelLabel = (details.modelLabel as string) ?? "your approach";
      
      if (status === "GREEN") {
        return `Your total fees are about ${formatPct(allInFees)}, which is reasonable for ${modelLabel}. Fees are one of the few things you can control.`;
      } else if (status === "RED") {
        return `Your fees total ${formatPct(allInFees)}—that could cost you ${formatCurrency(tenYearImpact, true)} over 10 years. Lower-cost options may be worth exploring.`;
      }
      return `Your fees are ${formatPct(allInFees)} per year. Over 10 years, that adds up to roughly ${formatCurrency(tenYearImpact, true)} in costs.`;
    }

    case "taxEfficiency": {
      const totalHarvestable = (details.totalHarvestable as number) ?? 0;
      const estimatedTaxSavings = (details.estimatedTaxSavings as number) ?? 0;
      const inefficientInTaxable = (details.inefficientInTaxable as unknown[]) ?? [];
      
      if (totalHarvestable > 0) {
        return `You have about ${formatCurrency(totalHarvestable, true)} in losses that could be harvested for roughly ${formatCurrency(estimatedTaxSavings, true)} in tax savings.`;
      } else if (inefficientInTaxable.length > 0) {
        return `Some tax-inefficient investments like bonds are in your taxable account. Moving them to a retirement account could save on taxes.`;
      } else if (status === "GREEN") {
        return `Your investments are positioned efficiently for taxes—good work keeping more of what you earn.`;
      }
      return `There may be opportunities to reduce your tax bill by repositioning some investments.`;
    }

    case "riskAdjusted": {
      const probability = (details.probability as number) ?? 50;
      const bandLabel = (details.bandLabel as string) ?? "Borderline";
      const incomeSecured = details.incomeSecured as boolean;
      
      if (incomeSecured) {
        return `Your essential expenses are covered by guaranteed income. Your ${probability.toFixed(0)}% success rate applies to extras and legacy goals.`;
      } else if (probability >= 75) {
        return `Based on your goals and timeline, you have a ${probability.toFixed(0)}% chance of success—a comfortable margin.`;
      } else if (probability >= 50) {
        return `Your plan has about a ${probability.toFixed(0)}% chance of success. Some adjustments could improve your odds.`;
      }
      return `At ${probability.toFixed(0)}% success probability, your plan may need changes. Consider saving more, adjusting your goal, or extending your timeline.`;
    }

    case "planningGaps": {
      const criticalMissing = (details.criticalMissing as string[]) ?? [];
      const completed = (details.completed as number) ?? 0;
      const total = (details.total as number) ?? 11;
      
      if (completed === total) {
        return `You've completed all the financial planning basics—your plan is well-protected.`;
      } else if (criticalMissing.length > 0) {
        const gaps = criticalMissing.slice(0, 2).map(s => sentenceCase(s)).join(" and ");
        return `A few important items are missing: ${gaps}. These protect your plan from unexpected life events.`;
      }
      return `Most planning basics are in place. ${total - completed} item${total - completed > 1 ? "s" : ""} remain to fully protect your plan.`;
    }

    case "lifetimeIncomeSecurity": {
      const coreCoveragePct = (details.coreCoveragePct as number) ?? 0;
      const needsDataEntry = details.needsDataEntry as boolean;
      const guaranteedIncome = (details.guaranteedLifetimeIncomeMonthly as number) ?? 0;
      const coreExpenses = (details.coreExpensesMonthly as number) ?? 0;
      
      if (needsDataEntry) {
        return `Enter your monthly expenses and income sources in the sidebar to see if your retirement income is on track.`;
      } else if (coreCoveragePct >= 1.0) {
        return `You're on track: your guaranteed income (${formatCurrency(guaranteedIncome)}/mo) covers your essential expenses. Market swings won't threaten your basic lifestyle.`;
      } else if (coreCoveragePct >= 0.8) {
        return `You're close: guaranteed income covers ${formatPct(coreCoveragePct, 0)} of essentials. Closing the gap would fully protect your basic needs.`;
      } else if (coreCoveragePct > 0) {
        return `At risk: only ${formatPct(coreCoveragePct, 0)} of your essential expenses are covered by guaranteed income. The rest depends on your portfolio.`;
      }
      return `No guaranteed lifetime income identified. Your entire retirement depends on portfolio performance.`;
    }

    case "performanceOptimization": {
      const sharpeRatio = (details.sharpeRatio as number) ?? 0;
      const pctOfTarget = (details.pctOfTarget as number) ?? 0;
      const relativeImprovement = (details.relativeImprovement as number) ?? 0;
      
      if (pctOfTarget >= 100) {
        return `Your portfolio is performing efficiently for the risk you're taking—returns are in line with expectations.`;
      } else if (pctOfTarget >= 80) {
        return `Your returns are close to target for your risk level. Small tweaks could improve efficiency by about ${formatPct(relativeImprovement, 0)}.`;
      }
      return `Your portfolio isn't earning as much as expected for the risk involved. There's room to improve by roughly ${formatPct(relativeImprovement, 0)}.`;
    }

    case "performanceMetrics": {
      const sharpeRatio = (details.sharpeRatio as number) ?? 0;
      const maxDrawdown = (details.maxDrawdown as number) ?? 0;
      
      if (status === "GREEN") {
        return `Your risk-adjusted returns look healthy. The portfolio balances growth and stability well.`;
      }
      return `These metrics show how your portfolio behaves—helping you compare performance on a level playing field.`;
    }

    default:
      return originalKeyFinding;
  }
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
    const bucket = inferAccountSubtype(h);
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

    const copy = CARD_COPY[id];
    
    cards.push({
      id,
      title: copy?.title ?? TITLE_MAP[id] ?? String(id),
      subtitle: copy?.subtitle,
      iconName: ICON_MAP[id],
      whyItMatters: WHY[id] ?? "This diagnostic highlights a portfolio health dimension.",
      status: r.status,
      score: r.score,
      keyFinding: consumerKeyFinding(id, r.keyFinding, r.details, r.status),
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
