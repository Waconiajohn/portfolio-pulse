import type { Holding } from "@/types/portfolio";

/**
 * Sample holdings set designed for testing:
 * - 3 "accounts" represented via the name prefix:
 *   [Brokerage]  -> accountType: Taxable
 *   [Trad IRA]   -> accountType: Tax-Advantaged
 *   [Roth IRA]   -> accountType: Tax-Advantaged
 *
 * This lets you test account-specific behaviors without changing the Holding type yet.
 * (If you later add accountLabel/accountId to Holding, we can migrate cleanly.)
 */

export const SAMPLE_HOLDINGS: Holding[] = [
  // ---------------------------------------------------------------------------
  // [Brokerage] Taxable account (mix of broad ETFs + a few single names + cash)
  // ---------------------------------------------------------------------------
  { id: "br-001", ticker: "VTI",  name: "[Brokerage] Vanguard Total Stock Market ETF", shares: 420, currentPrice: 252.30, costBasis: 210.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0.0003 },
  { id: "br-002", ticker: "VXUS", name: "[Brokerage] Vanguard Total International Stock ETF", shares: 620, currentPrice: 58.40,  costBasis: 62.00,  accountType: "Taxable", assetClass: "Intl Stocks", expenseRatio: 0.0007 },
  { id: "br-003", ticker: "BND",  name: "[Brokerage] Vanguard Total Bond Market ETF", shares: 520, currentPrice: 72.50,  costBasis: 78.00,  accountType: "Taxable", assetClass: "Bonds", expenseRatio: 0.0003 },
  { id: "br-004", ticker: "SGOV", name: "[Brokerage] iShares 0-3 Month Treasury Bond ETF (cash proxy)", shares: 900, currentPrice: 100.20, costBasis: 100.00, accountType: "Taxable", assetClass: "Cash", expenseRatio: 0.0005 },

  // Taxable: single names (some gains + some losses for TLH testing)
  { id: "br-010", ticker: "AAPL", name: "[Brokerage] Apple Inc.", shares: 85, currentPrice: 178.50, costBasis: 145.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0 },
  { id: "br-011", ticker: "MSFT", name: "[Brokerage] Microsoft Corp.", shares: 55, currentPrice: 378.90, costBasis: 290.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0 },
  { id: "br-012", ticker: "DIS",  name: "[Brokerage] Walt Disney Co. (TLH candidate)", shares: 60, currentPrice: 91.50,  costBasis: 135.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0 },
  { id: "br-013", ticker: "PYPL", name: "[Brokerage] PayPal (TLH candidate)", shares: 70, currentPrice: 62.40,  costBasis: 110.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0 },

  // Taxable: diversifiers
  { id: "br-020", ticker: "VNQ", name: "[Brokerage] Vanguard Real Estate ETF", shares: 180, currentPrice: 84.20, costBasis: 95.00, accountType: "Taxable", assetClass: "Other", expenseRatio: 0.0012 },
  { id: "br-021", ticker: "GLD", name: "[Brokerage] SPDR Gold Shares", shares: 55, currentPrice: 186.50, costBasis: 170.00, accountType: "Taxable", assetClass: "Commodities", expenseRatio: 0.004 },

  // ---------------------------------------------------------------------------
  // [Trad IRA] Tax-Advantaged account (core allocation + a deliberately higher-fee fund)
  // ---------------------------------------------------------------------------
  { id: "ira-001", ticker: "VOO",  name: "[Trad IRA] Vanguard S&P 500 ETF", shares: 260, currentPrice: 478.50, costBasis: 420.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0003 },
  { id: "ira-002", ticker: "VXF",  name: "[Trad IRA] Vanguard Extended Market ETF", shares: 220, currentPrice: 175.30, costBasis: 155.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0006 },
  { id: "ira-003", ticker: "SCHD", name: "[Trad IRA] Schwab U.S. Dividend Equity ETF", shares: 500, currentPrice: 76.10,  costBasis: 70.00,  accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0006 },
  { id: "ira-004", ticker: "IXUS", name: "[Trad IRA] iShares Core MSCI Total International Stock ETF", shares: 420, currentPrice: 67.20, costBasis: 69.00, accountType: "Tax-Advantaged", assetClass: "Intl Stocks", expenseRatio: 0.0007 },
  { id: "ira-005", ticker: "AGG",  name: "[Trad IRA] iShares Core U.S. Aggregate Bond ETF", shares: 650, currentPrice: 98.20, costBasis: 105.00, accountType: "Tax-Advantaged", assetClass: "Bonds", expenseRatio: 0.0003 },
  { id: "ira-006", ticker: "TIP",  name: "[Trad IRA] iShares TIPS Bond ETF", shares: 260, currentPrice: 109.40, costBasis: 112.00, accountType: "Tax-Advantaged", assetClass: "Bonds", expenseRatio: 0.0019 },

  // Higher-fee example (to make the Fees card more interesting)
  { id: "ira-020", ticker: "IWF",  name: "[Trad IRA] iShares Russell 1000 Growth ETF (higher-fee example)", shares: 200, currentPrice: 365.10, costBasis: 320.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0019 },

  // ---------------------------------------------------------------------------
  // [Roth IRA] Tax-Advantaged account (growth tilt + deliberate concentration stressor)
  // ---------------------------------------------------------------------------
  { id: "roth-001", ticker: "QQQ",  name: "[Roth IRA] Invesco QQQ Trust", shares: 120, currentPrice: 408.20, costBasis: 350.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.002 },
  { id: "roth-002", ticker: "VGT",  name: "[Roth IRA] Vanguard Information Technology ETF", shares: 140, currentPrice: 485.60, costBasis: 410.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.001 },
  { id: "roth-003", ticker: "SMH",  name: "[Roth IRA] VanEck Semiconductor ETF", shares: 110, currentPrice: 192.80, costBasis: 150.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0035 },

  // Deliberate "concentration stressor" holding to help Shock Watch trigger
  { id: "roth-010", ticker: "NVDA", name: "[Roth IRA] NVIDIA Corp. (concentration stressor)", shares: 120, currentPrice: 495.00, costBasis: 220.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0 },

  // Small diversifier in Roth
  { id: "roth-020", ticker: "BND",  name: "[Roth IRA] Vanguard Total Bond Market ETF", shares: 120, currentPrice: 72.50, costBasis: 78.00, accountType: "Tax-Advantaged", assetClass: "Bonds", expenseRatio: 0.0003 },
];

/**
 * Partner sample holdings - represents a partner's portfolio for household view testing
 * Partner "Sarah" has a more conservative allocation
 */
export const PARTNER_SAMPLE_HOLDINGS: Holding[] = [
  // ---------------------------------------------------------------------------
  // [Partner 401k] Tax-Advantaged account (balanced allocation)
  // ---------------------------------------------------------------------------
  { id: "p-401k-001", ticker: "FXAIX", name: "[Partner 401k] Fidelity 500 Index Fund", shares: 350, currentPrice: 185.20, costBasis: 160.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.00015 },
  { id: "p-401k-002", ticker: "FXNAX", name: "[Partner 401k] Fidelity U.S. Bond Index Fund", shares: 800, currentPrice: 10.85, costBasis: 11.20, accountType: "Tax-Advantaged", assetClass: "Bonds", expenseRatio: 0.00025 },
  { id: "p-401k-003", ticker: "FSPSX", name: "[Partner 401k] Fidelity International Index Fund", shares: 450, currentPrice: 44.30, costBasis: 46.00, accountType: "Tax-Advantaged", assetClass: "Intl Stocks", expenseRatio: 0.00035 },
  { id: "p-401k-004", ticker: "FSMDX", name: "[Partner 401k] Fidelity Mid Cap Index Fund", shares: 280, currentPrice: 32.80, costBasis: 30.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.00025 },

  // ---------------------------------------------------------------------------
  // [Partner Roth IRA] Tax-Advantaged (growth oriented)
  // ---------------------------------------------------------------------------
  { id: "p-roth-001", ticker: "VUG",  name: "[Partner Roth] Vanguard Growth ETF", shares: 95, currentPrice: 352.40, costBasis: 310.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0004 },
  { id: "p-roth-002", ticker: "ARKK", name: "[Partner Roth] ARK Innovation ETF (higher risk)", shares: 75, currentPrice: 48.20, costBasis: 85.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0075 },
  { id: "p-roth-003", ticker: "VB",   name: "[Partner Roth] Vanguard Small-Cap ETF", shares: 110, currentPrice: 215.80, costBasis: 195.00, accountType: "Tax-Advantaged", assetClass: "US Stocks", expenseRatio: 0.0005 },

  // ---------------------------------------------------------------------------
  // [Partner Brokerage] Taxable account (conservative with some individual stocks)
  // ---------------------------------------------------------------------------
  { id: "p-br-001", ticker: "SCHB", name: "[Partner Brokerage] Schwab U.S. Broad Market ETF", shares: 280, currentPrice: 58.90, costBasis: 52.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0.0003 },
  { id: "p-br-002", ticker: "VTIP", name: "[Partner Brokerage] Vanguard Short-Term Inflation-Protected Securities ETF", shares: 350, currentPrice: 48.40, costBasis: 49.50, accountType: "Taxable", assetClass: "Bonds", expenseRatio: 0.0004 },
  { id: "p-br-003", ticker: "JNJ",  name: "[Partner Brokerage] Johnson & Johnson", shares: 45, currentPrice: 155.20, costBasis: 165.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0 },
  { id: "p-br-004", ticker: "PG",   name: "[Partner Brokerage] Procter & Gamble", shares: 35, currentPrice: 162.80, costBasis: 145.00, accountType: "Taxable", assetClass: "US Stocks", expenseRatio: 0 },
  { id: "p-br-005", ticker: "SPAXX", name: "[Partner Brokerage] Fidelity Money Market (cash)", shares: 15000, currentPrice: 1.00, costBasis: 1.00, accountType: "Taxable", assetClass: "Cash", expenseRatio: 0.0042 },
];

/**
 * Mock partner info for sample data
 */
export const SAMPLE_PARTNER = {
  id: 'sample-partner-id',
  name: 'Sarah',
  email: 'sarah@example.com',
  relationshipType: 'spouse' as const,
};

/**
 * Optional: grouped view for future UI (does not affect current dashboard).
 */
export const SAMPLE_HOLDINGS_BY_ACCOUNT = {
  brokerage: SAMPLE_HOLDINGS.filter((h) => h.id.startsWith("br-")),
  tradIra: SAMPLE_HOLDINGS.filter((h) => h.id.startsWith("ira-")),
  rothIra: SAMPLE_HOLDINGS.filter((h) => h.id.startsWith("roth-")),
};

export const PARTNER_HOLDINGS_BY_ACCOUNT = {
  partner401k: PARTNER_SAMPLE_HOLDINGS.filter((h) => h.id.startsWith("p-401k-")),
  partnerRoth: PARTNER_SAMPLE_HOLDINGS.filter((h) => h.id.startsWith("p-roth-")),
  partnerBrokerage: PARTNER_SAMPLE_HOLDINGS.filter((h) => h.id.startsWith("p-br-")),
};
