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

    const { public_token, metadata } = await req.json();

    if (!public_token) {
      return new Response(
        JSON.stringify({ error: 'public_token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine Plaid API base URL
    const plaidBaseUrl = plaidEnv === 'production' 
      ? 'https://production.plaid.com'
      : plaidEnv === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com';

    console.log(`Exchanging public token for user ${user.id}`);

    // Exchange public token for access token
    const exchangeResponse = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        public_token: public_token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('Plaid exchange error:', exchangeData);
      return new Response(
        JSON.stringify({ error: exchangeData.error_message || 'Failed to exchange token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, item_id } = exchangeData;

    // Get institution details from metadata
    const institutionName = metadata?.institution?.name || 'Unknown Institution';
    const institutionId = metadata?.institution?.institution_id || null;

    // Store linked account in database (access token should be encrypted in production)
    // For now, we store it - in production, use encryption
    const accounts = metadata?.accounts || [];
    
    for (const account of accounts) {
      const { error: insertError } = await supabase
        .from('linked_accounts')
        .upsert({
          user_id: user.id,
          plaid_item_id: item_id,
          plaid_access_token_encrypted: access_token, // TODO: Encrypt in production
          institution_name: institutionName,
          institution_id: institutionId,
          account_name: account.name,
          account_type: account.subtype?.includes('ira') || account.subtype?.includes('401') 
            ? 'Tax-Advantaged' 
            : 'Taxable',
          account_mask: account.mask,
          sync_status: 'pending',
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'plaid_item_id'
        });

      if (insertError) {
        console.error('Error storing linked account:', insertError);
      }
    }

    console.log(`Successfully linked ${accounts.length} accounts for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        item_id: item_id,
        accounts_linked: accounts.length,
        institution: institutionName,
        message: 'Account linked successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in plaid-exchange-token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
