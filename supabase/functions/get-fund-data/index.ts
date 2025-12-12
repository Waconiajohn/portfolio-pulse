import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fund expense ratio database (common funds)
const FUND_EXPENSE_RATIOS: Record<string, { name: string; expenseRatio: number }> = {
  // Vanguard
  'VTI': { name: 'Vanguard Total Stock Market ETF', expenseRatio: 0.0003 },
  'VTSAX': { name: 'Vanguard Total Stock Market Index Fund', expenseRatio: 0.0004 },
  'VOO': { name: 'Vanguard S&P 500 ETF', expenseRatio: 0.0003 },
  'VFIAX': { name: 'Vanguard 500 Index Fund', expenseRatio: 0.0004 },
  'VTV': { name: 'Vanguard Value ETF', expenseRatio: 0.0004 },
  'VUG': { name: 'Vanguard Growth ETF', expenseRatio: 0.0004 },
  'VXUS': { name: 'Vanguard Total International Stock ETF', expenseRatio: 0.0007 },
  'VTIAX': { name: 'Vanguard Total International Stock Index Fund', expenseRatio: 0.0011 },
  'VEA': { name: 'Vanguard FTSE Developed Markets ETF', expenseRatio: 0.0005 },
  'VWO': { name: 'Vanguard FTSE Emerging Markets ETF', expenseRatio: 0.0008 },
  'BND': { name: 'Vanguard Total Bond Market ETF', expenseRatio: 0.0003 },
  'VBTLX': { name: 'Vanguard Total Bond Market Index Fund', expenseRatio: 0.0005 },
  'BNDX': { name: 'Vanguard Total International Bond ETF', expenseRatio: 0.0007 },
  'VNQ': { name: 'Vanguard Real Estate ETF', expenseRatio: 0.0012 },
  
  // iShares (BlackRock)
  'IVV': { name: 'iShares Core S&P 500 ETF', expenseRatio: 0.0003 },
  'ITOT': { name: 'iShares Core S&P Total US Stock Market ETF', expenseRatio: 0.0003 },
  'AGG': { name: 'iShares Core US Aggregate Bond ETF', expenseRatio: 0.0003 },
  'IEFA': { name: 'iShares Core MSCI EAFE ETF', expenseRatio: 0.0007 },
  'IEMG': { name: 'iShares Core MSCI Emerging Markets ETF', expenseRatio: 0.0009 },
  'IWM': { name: 'iShares Russell 2000 ETF', expenseRatio: 0.0019 },
  'IWF': { name: 'iShares Russell 1000 Growth ETF', expenseRatio: 0.0019 },
  'IWD': { name: 'iShares Russell 1000 Value ETF', expenseRatio: 0.0019 },
  'TIP': { name: 'iShares TIPS Bond ETF', expenseRatio: 0.0019 },
  
  // SPDR (State Street)
  'SPY': { name: 'SPDR S&P 500 ETF Trust', expenseRatio: 0.0009 },
  'GLD': { name: 'SPDR Gold Shares', expenseRatio: 0.004 },
  'XLF': { name: 'Financial Select Sector SPDR Fund', expenseRatio: 0.001 },
  'XLK': { name: 'Technology Select Sector SPDR Fund', expenseRatio: 0.001 },
  'XLE': { name: 'Energy Select Sector SPDR Fund', expenseRatio: 0.001 },
  'XLV': { name: 'Health Care Select Sector SPDR Fund', expenseRatio: 0.001 },
  
  // Schwab
  'SCHB': { name: 'Schwab U.S. Broad Market ETF', expenseRatio: 0.0003 },
  'SCHX': { name: 'Schwab U.S. Large-Cap ETF', expenseRatio: 0.0003 },
  'SCHF': { name: 'Schwab International Equity ETF', expenseRatio: 0.0006 },
  'SCHE': { name: 'Schwab Emerging Markets Equity ETF', expenseRatio: 0.0011 },
  'SCHZ': { name: 'Schwab U.S. Aggregate Bond ETF', expenseRatio: 0.0003 },
  
  // Fidelity
  'FXAIX': { name: 'Fidelity 500 Index Fund', expenseRatio: 0.00015 },
  'FSKAX': { name: 'Fidelity Total Market Index Fund', expenseRatio: 0.00015 },
  'FTIHX': { name: 'Fidelity Total International Index Fund', expenseRatio: 0.0006 },
  'FXNAX': { name: 'Fidelity U.S. Bond Index Fund', expenseRatio: 0.00025 },
  
  // Popular active funds (higher expense ratios)
  'ARKK': { name: 'ARK Innovation ETF', expenseRatio: 0.0075 },
  'PBLAX': { name: 'PIMCO Total Return Fund', expenseRatio: 0.007 },
  'FMAGX': { name: 'Fidelity Magellan Fund', expenseRatio: 0.0079 },
  'AGTHX': { name: 'American Funds Growth Fund of America', expenseRatio: 0.0062 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers)) {
      return new Response(
        JSON.stringify({ error: 'tickers array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up expense ratios for ${tickers.length} tickers`);

    const results: Record<string, { name: string; expenseRatio: number | null }> = {};

    for (const ticker of tickers) {
      const upperTicker = ticker.toUpperCase();
      if (FUND_EXPENSE_RATIOS[upperTicker]) {
        results[upperTicker] = FUND_EXPENSE_RATIOS[upperTicker];
      } else {
        // Individual stocks have no expense ratio
        results[upperTicker] = { name: ticker, expenseRatio: null };
      }
    }

    return new Response(
      JSON.stringify({ 
        results,
        found: Object.values(results).filter(r => r.expenseRatio !== null).length,
        total: tickers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-fund-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
