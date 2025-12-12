// src/domain/summary/buildActionPlan.ts
import type { Recommendation } from "@/types/portfolio";
import type { CardContract } from "@/domain/cards/types";

export function buildActionPlan(cards: CardContract[], maxItems = 6): Recommendation[] {
  const all = cards.flatMap((c) => c.recommendations || []);

  // De-dupe by id
  const map = new Map<string, Recommendation>();
  for (const r of all) map.set(r.id, r);

  const deduped = Array.from(map.values());

  // Sort: priority ascending (1 = most important), then strongest impact text length (simple tie-break)
  deduped.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (b.impact?.length ?? 0) - (a.impact?.length ?? 0);
  });

  return deduped.slice(0, maxItems);
}
