// src/data/plaid/mapPlaidToHolding.ts
import type { Holding, AssetClass, AccountType } from "@/types/portfolio";

type PlaidHolding = {
  security_id: string;
  quantity: number;
  institution_value: number;
  institution_price: number;
};

type PlaidSecurity = {
  security_id: string;
  ticker_symbol?: string;
  name: string;
  type?: string; // "etf", "mutual fund", "equity", etc.
};

function mapPlaidTypeToAssetClass(plaidType?: string): AssetClass {
  const t = (plaidType ?? "").toLowerCase();
  if (t.includes("bond") || t.includes("fixed")) return "Bonds";
  if (t.includes("cash")) return "Cash";
  if (t.includes("crypto")) return "Other";
  // v1 default: treat market equities as US Stocks (refine later with region/security metadata)
  return "US Stocks";
}

export function mapPlaidToHoldings(params: {
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  accountType?: AccountType;
}): Holding[] {
  const secMap = new Map(params.securities.map((s) => [s.security_id, s]));
  const accountType = params.accountType ?? "Taxable";

  return params.holdings.map((h, idx) => {
    const s = secMap.get(h.security_id);
    const ticker = s?.ticker_symbol ?? `SEC_${h.security_id.slice(0, 6)}`;
    const name = s?.name ?? "Unknown";
    const currentPrice = h.institution_price ?? 0;
    const shares = h.quantity ?? 0;
    const value = h.institution_value ?? shares * currentPrice;

    return {
      id: `${h.security_id}-${idx}`,
      ticker,
      name,
      shares,
      currentPrice,
      costBasis: value / (shares || 1), // placeholder until you have lots/cost basis
      accountType,
      assetClass: mapPlaidTypeToAssetClass(s?.type),
      expenseRatio: undefined, // enrich later from market data
    };
  });
}
