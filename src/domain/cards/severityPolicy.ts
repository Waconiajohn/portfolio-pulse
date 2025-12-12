// src/domain/cards/severityPolicy.ts
import type { CardContract, CardSeverity } from "./types";

type Status = "GREEN" | "YELLOW" | "RED";

// Helpers
function asNumber(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getDetail(details: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = asNumber(details[k]);
    if (v !== null) return v;
  }
  return null;
}

/**
 * Severity thresholds (v1):
 * - riskDiversification: concentration extreme if topHoldingPct >= 25 OR concentrationIndex high
 * - costAnalysis: weightedExpenseRatioPct extreme if >= 0.80%
 * - downsideResilience: extreme if maxDrawdownPct <= -25 OR downsideCapture > 120
 * - performanceOptimization: extreme if underperformance vs benchmark beyond threshold (alphaPct <= -3 over period)
 * - taxEfficiency: extreme if taxDragPct >= 1.0
 * - lifetimeIncomeSecurity: extreme if fundedRatioPct < 80
 * If data not present, fall back to RED+low score heuristic.
 */
export function computeSeverity(card: Pick<CardContract, "id" | "status" | "score" | "details">): CardSeverity {
  const id = card.id;
  const status = card.status as Status;

  // Metric-based rules where we can
  if (id === "riskDiversification") {
    const topPct = getDetail(card.details as any, ["topHoldingPct", "topHoldingPercent", "concentrationTopPct"]);
    if (topPct !== null && topPct >= 25) return "EXTREME";
  }

  if (id === "costAnalysis") {
    const fee = getDetail(card.details as any, ["weightedExpenseRatioPct", "expenseRatioPct", "feesPct"]);
    if (fee !== null && fee >= 0.8) return "EXTREME";
  }

  if (id === "downsideResilience") {
    const maxDD = getDetail(card.details as any, ["maxDrawdownPct", "maxDrawdown", "drawdownPct"]);
    if (maxDD !== null && maxDD <= -25) return "EXTREME";
    const downsideCapture = getDetail(card.details as any, ["downsideCapture", "downsideCapturePct"]);
    if (downsideCapture !== null && downsideCapture >= 120) return "EXTREME";
  }

  if (id === "performanceOptimization") {
    const alpha = getDetail(card.details as any, ["alphaPct", "alpha", "underperformancePct"]);
    if (alpha !== null && alpha <= -3) return "EXTREME";
  }

  if (id === "taxEfficiency") {
    const taxDrag = getDetail(card.details as any, ["taxDragPct", "taxCostPct", "afterTaxGapPct"]);
    if (taxDrag !== null && taxDrag >= 1.0) return "EXTREME";
  }

  if (id === "lifetimeIncomeSecurity") {
    const funded = getDetail(card.details as any, ["fundedRatioPct", "incomeFundedPct", "coveragePct"]);
    if (funded !== null && funded < 80) return "EXTREME";
  }

  // Fallback heuristic if details don't include metrics yet
  if (status === "RED" && card.score <= 35) return "EXTREME";
  return "NORMAL";
}
