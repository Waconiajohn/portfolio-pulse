// src/domain/shock/shockDetector.ts
import type { CardContract } from "@/domain/cards/types";
import type { ShockAlert, ShockSeverity } from "./types";

function toDriverLine(card: CardContract): string {
  // Keep it short and human
  const base = card.title || String(card.id);
  if (card.keyFinding) return `${base}: ${card.keyFinding}`;
  if (card.headlineMetric) return `${base}: ${card.headlineMetric}`;
  return base;
}

function mergeActions(cards: CardContract[]): ShockAlert["actions"] {
  const all = cards.flatMap((c) => c.actions || []);
  const seen = new Set<string>();
  const deduped = [];

  for (const a of all) {
    const key = `${a.kind}:${a.deepLink ?? ""}:${a.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }

  return deduped.slice(0, 4);
}

function computeSeverity(cards: CardContract[]): ShockSeverity {
  const extremeCards = cards.filter((c) => c.severity === "EXTREME");
  const redCards = cards.filter((c) => c.status === "RED");
  const yellowCards = cards.filter((c) => c.status === "YELLOW");

  const extremeCount = extremeCards.length;
  const redCount = redCards.length;

  // Keep EXTREME meaningfully rare
  if (extremeCount >= 2 || redCount >= 2) return "EXTREME";

  // Tighten ELEVATED to avoid alert fatigue
  if (extremeCount >= 1 || redCount >= 1) return "ELEVATED";

  if (yellowCards.length >= 2) {
    const lowestYellowScore = Math.min(...yellowCards.map((c) => (c.score ?? 100)));
    if (lowestYellowScore <= 60) return "ELEVATED";
  }

  return "NORMAL";
}

export function detectShockAlert(cards: CardContract[]): ShockAlert | null {
  if (!cards || cards.length === 0) return null;

  const extremeCards = cards.filter((c) => c.severity === "EXTREME");
  const redCards = cards.filter((c) => c.status === "RED");

  const severity = computeSeverity(cards);
  if (severity === "NORMAL") return null;

  // Pick top drivers: prefer EXTREME cards, otherwise RED cards
  const driversSource = extremeCards.length > 0 ? extremeCards : redCards;
  const sortedDrivers = driversSource
    .slice()
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
  const drivers = sortedDrivers
    .slice(0, 3)
    .map(toDriverLine)
    .filter(Boolean);

  const actions = mergeActions(driversSource);

  const title =
    severity === "EXTREME" ? "Shock Watch: High Fragility Detected" : "Shock Watch: Elevated Risk Signals";

  const message =
    severity === "EXTREME"
      ? "Your portfolio shows extreme fragility signals. In a sudden market move, these can force painful decisions. Address the top drivers below first."
      : "Your portfolio shows elevated risk signals. Consider small, high-impact adjustments to reduce downside exposure.";

  return { severity, title, message, drivers, actions };
}
