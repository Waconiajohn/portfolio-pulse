import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ 
          error: 'Plaid integration not configured',
          configured: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Syncing accounts for user ${user.id}`);

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
          success: true,
          accounts_synced: 0,
          message: 'No linked accounts to sync',
          configured: true
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

    let syncedCount = 0;
    let errorCount = 0;
    const syncResults: any[] = [];

    // Sync each linked account
    for (const account of linkedAccounts) {
      if (!account.plaid_access_token_encrypted) {
        syncResults.push({
          account_id: account.id,
          status: 'skipped',
          reason: 'No access token'
        });
        continue;
      }

      try {
        // Get item status
        const itemResponse = await fetch(`${plaidBaseUrl}/item/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: account.plaid_access_token_encrypted,
          }),
        });

        const itemData = await itemResponse.json();

        if (!itemResponse.ok) {
          console.error(`Plaid item error for account ${account.id}:`, itemData);
          
          // Check if item needs re-authentication
          if (itemData.error_code === 'ITEM_LOGIN_REQUIRED') {
            await supabase
              .from('linked_accounts')
              .update({ sync_status: 'error' })
              .eq('id', account.id);
            
            syncResults.push({
              account_id: account.id,
              status: 'error',
              reason: 'Re-authentication required',
              error_code: itemData.error_code
            });
            errorCount++;
            continue;
          }
          
          syncResults.push({
            account_id: account.id,
            status: 'error',
            reason: itemData.error_message
          });
          errorCount++;
          continue;
        }

        // Update account info
        const { item, status } = itemData;
        
        await supabase
          .from('linked_accounts')
          .update({ 
            sync_status: 'synced',
            last_sync_at: new Date().toISOString()
          })
          .eq('id', account.id);

        syncResults.push({
          account_id: account.id,
          status: 'synced',
          institution: account.institution_name,
          last_webhook: status?.last_webhook
        });
        syncedCount++;

      } catch (err) {
        console.error(`Error syncing account ${account.id}:`, err);
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        syncResults.push({
          account_id: account.id,
          status: 'error',
          reason: errMessage
        });
        errorCount++;
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        accounts_synced: syncedCount,
        accounts_errored: errorCount,
        results: syncResults,
        configured: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in plaid-sync-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
