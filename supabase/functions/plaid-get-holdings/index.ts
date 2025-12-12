import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Plaid account subtypes to our account types
function mapAccountType(subtype: string): 'Taxable' | 'Tax-Advantaged' {
  const taxAdvantaged = ['ira', '401k', '403b', 'roth', 'sep', 'simple', 'keogh', 'pension'];
  return taxAdvantaged.some(t => subtype?.toLowerCase().includes(t)) 
    ? 'Tax-Advantaged' 
    : 'Taxable';
}

// Map sector to asset class
function mapAssetClass(securityType: string, sector: string): string {
  if (securityType === 'cash' || securityType === 'money market') return 'Cash';
  if (securityType === 'fixed income' || securityType === 'bond') return 'Bonds';
  if (securityType === 'commodity') return 'Commodities';
  if (sector?.toLowerCase().includes('international') || sector?.toLowerCase().includes('foreign')) {
    return 'Intl Stocks';
  }
  if (securityType === 'equity' || securityType === 'etf' || securityType === 'mutual fund') {
    return 'US Stocks';
  }
  return 'Other';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Plaid credentials from secrets
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET');
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';

    if (!plaidClientId || !plaidSecret) {
      return new Response(
        JSON.stringify({ error: 'Plaid integration not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching holdings for user ${user.id}`);

    // Get user's linked accounts
    const { data: linkedAccounts, error: accountsError } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountsError) {
      console.error('Error fetching linked accounts:', accountsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch linked accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!linkedAccounts || linkedAccounts.length === 0) {
      return new Response(
        JSON.stringify({ 
          holdings: [],
          accounts: [],
          summary: { totalValue: 0, holdingCount: 0, accountCount: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine Plaid API base URL
    const plaidBaseUrl = plaidEnv === 'production' 
      ? 'https://production.plaid.com'
      : plaidEnv === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com';

    const allHoldings: any[] = [];
    const allAccounts: any[] = [];
    let totalValue = 0;

    // Fetch holdings from each linked account
    for (const account of linkedAccounts) {
      if (!account.plaid_access_token_encrypted) continue;

      try {
        const holdingsResponse = await fetch(`${plaidBaseUrl}/investments/holdings/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: account.plaid_access_token_encrypted,
          }),
        });

        const holdingsData = await holdingsResponse.json();

        if (!holdingsResponse.ok) {
          console.error(`Plaid holdings error for account ${account.id}:`, holdingsData);
          
          // Update account sync status to error
          await supabase
            .from('linked_accounts')
            .update({ sync_status: 'error' })
            .eq('id', account.id);
          
          continue;
        }

        const { holdings, securities, accounts: plaidAccounts } = holdingsData;

        // Map accounts
        for (const plaidAccount of plaidAccounts) {
          allAccounts.push({
            id: plaidAccount.account_id,
            name: plaidAccount.name,
            type: mapAccountType(plaidAccount.subtype),
            institution: account.institution_name,
            balance: plaidAccount.balances?.current || 0,
          });
        }

        // Transform and store holdings
        for (const holding of holdings) {
          const security = securities.find((s: any) => s.security_id === holding.security_id);
          const plaidAccount = plaidAccounts.find((a: any) => a.account_id === holding.account_id);
          
          const holdingValue = holding.quantity * holding.institution_price;
          totalValue += holdingValue;

          const transformedHolding = {
            user_id: user.id,
            account_id: account.id,
            ticker: security?.ticker_symbol || 'UNKNOWN',
            name: security?.name || 'Unknown Security',
            shares: holding.quantity,
            current_price: holding.institution_price,
            cost_basis: holding.cost_basis || 0,
            account_type: mapAccountType(plaidAccount?.subtype || ''),
            asset_class: mapAssetClass(security?.type || '', security?.sector || ''),
            expense_ratio: 0, // Would need additional data source
            sector: security?.sector || null,
            is_manual_entry: false,
            last_updated: new Date().toISOString(),
          };

          allHoldings.push(transformedHolding);
        }

        // Update account sync status
        await supabase
          .from('linked_accounts')
          .update({ 
            sync_status: 'synced',
            last_sync_at: new Date().toISOString()
          })
          .eq('id', account.id);

      } catch (err) {
        console.error(`Error fetching from account ${account.id}:`, err);
      }
    }

    // Upsert holdings to database
    if (allHoldings.length > 0) {
      // First, delete existing non-manual holdings for this user
      await supabase
        .from('holdings')
        .delete()
        .eq('user_id', user.id)
        .eq('is_manual_entry', false);

      // Insert new holdings
      const { error: insertError } = await supabase
        .from('holdings')
        .insert(allHoldings);

      if (insertError) {
        console.error('Error storing holdings:', insertError);
      }
    }

    console.log(`Fetched ${allHoldings.length} holdings from ${allAccounts.length} accounts`);

    return new Response(
      JSON.stringify({
        holdings: allHoldings.map(h => ({
          ...h,
          totalValue: h.shares * h.current_price,
        })),
        accounts: allAccounts,
        summary: {
          totalValue,
          holdingCount: allHoldings.length,
          accountCount: allAccounts.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in plaid-get-holdings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
