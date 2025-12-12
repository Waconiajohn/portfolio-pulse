// src/domain/shock/types.ts
import type { CardAction } from "@/domain/cards/types";

export type ShockSeverity = "NORMAL" | "ELEVATED" | "EXTREME";

export type ShockAlert = {
  severity: ShockSeverity;
  title: string;
  message: string;
  drivers: string[];     // short bullet list of "why"
  actions: CardAction[]; // suggested actions (buttons)
};
