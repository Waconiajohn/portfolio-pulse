// src/domain/cards/getCardById.ts
import type { CardContract } from "./types";

export function getCardById(cards: CardContract[], id: string | null): CardContract | null {
  if (!id) return null;
  return cards.find((c) => String(c.id) === String(id)) ?? null;
}
