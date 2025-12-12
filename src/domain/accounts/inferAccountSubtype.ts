import type { Holding } from "@/types/portfolio";

export type AccountBucket = "Brokerage" | "Traditional IRA" | "Roth IRA" | "Unknown";

export function inferAccountSubtype(holding: Holding): AccountBucket {
  const name = (holding.name || "").toLowerCase();
  
  // Check name patterns first
  if (name.includes("roth")) {
    return "Roth IRA";
  }
  if (name.includes("trad ira") || name.includes("traditional") || name.includes("[ira]")) {
    return "Traditional IRA";
  }
  
  // Fallback to accountType
  if (holding.accountType === "Taxable") {
    return "Brokerage";
  }
  
  // Tax-Advantaged without specific name indicator defaults to Traditional IRA
  if (holding.accountType === "Tax-Advantaged") {
    return "Traditional IRA";
  }
  
  return "Unknown";
}
