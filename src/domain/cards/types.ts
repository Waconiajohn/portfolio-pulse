// src/domain/cards/types.ts
import type { DiagnosticStatus, Recommendation, PortfolioAnalysis } from "@/types/portfolio";

export type CardSeverity = "NORMAL" | "EXTREME";

export type CardActionKind =
  | "LEARN"
  | "REBALANCE"
  | "REDUCE_FEES"
  | "DIVERSIFY"
  | "RISK_REDUCE"
  | "TAX_OPTIMIZE"
  | "BENCHMARK"
  | "TACTICAL";

export type CardAction = {
  label: string;
  kind: CardActionKind;
  deepLink?: string; // route inside app (optional)
};

export type CardContract = {
  id: keyof PortfolioAnalysis["diagnostics"] | "summary";
  title: string;
  iconName?: string;

  // Why this card exists (education/explanation)
  whyItMatters: string;

  // Existing engine output
  status: DiagnosticStatus;
  score: number;
  keyFinding: string;
  headlineMetric: string;
  details: Record<string, unknown>;

  // Account-aware context (e.g., "Primary driver: Roth IRA")
  contextLabel?: string;

  // Additions to support your "extremes + actions" vision
  severity: CardSeverity;
  recommendations: Recommendation[];
  actions: CardAction[];
};
