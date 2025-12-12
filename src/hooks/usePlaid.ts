import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface PlaidLinkStatus {
  configured: boolean;
  loading: boolean;
  linkToken: string | null;
  error: string | null;
}

interface LinkedAccount {
  id: string;
  user_id: string;
  plaid_item_id: string | null;
  institution_name: string | null;
  account_name: string | null;
  account_type: 'Taxable' | 'Tax-Advantaged' | null;
  account_mask: string | null;
  last_sync_at: string | null;
  sync_status: 'pending' | 'synced' | 'error' | null;
  created_at: string;
}

export function usePlaid() {
  const { session } = useAuth();
  const [status, setStatus] = useState<PlaidLinkStatus>({
    configured: true, // Assume configured until we check
    loading: false,
    linkToken: null,
    error: null,
  });
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Check if Plaid is configured and create link token
  const initializePlaidLink = useCallback(async () => {
    if (!session?.access_token) {
      setStatus(prev => ({ ...prev, error: 'Not authenticated' }));
      return null;
    }

    setStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('plaid-create-link-token', {
        body: { clientName: 'PortfolioGuard' },
      });

      if (error) throw error;

      if (!data.configured) {
        setStatus({
          configured: false,
          loading: false,
          linkToken: null,
          error: data.message || 'Plaid not configured',
        });
        return null;
      }

      setStatus({
        configured: true,
        loading: false,
        linkToken: data.link_token,
        error: null,
      });

      return data.link_token;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Plaid';
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [session?.access_token]);

  // Exchange public token after successful Plaid Link
  const exchangePublicToken = useCallback(async (publicToken: string, metadata: any) => {
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
        body: { public_token: publicToken, metadata },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Linked ${data.accounts_linked} account(s) from ${data.institution}`);
        await fetchLinkedAccounts();
        return true;
      } else {
        toast.error(data.error || 'Failed to link account');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to exchange token';
      toast.error(errorMessage);
      return false;
    }
  }, [session?.access_token]);

  // Fetch user's linked accounts from database
  const fetchLinkedAccounts = useCallback(async () => {
    if (!session?.user?.id) return;

    setAccountsLoading(true);
    try {
      const { data, error } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedAccounts((data as LinkedAccount[]) || []);
    } catch (err) {
      console.error('Error fetching linked accounts:', err);
    } finally {
      setAccountsLoading(false);
    }
  }, [session?.user?.id]);

  // Sync holdings from all linked accounts
  const syncHoldings = useCallback(async () => {
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('plaid-get-holdings', {});

      if (error) throw error;

      if (data.holdings) {
        toast.success(`Synced ${data.holdings.length} holdings from ${data.summary.accountCount} accounts`);
        return data;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync holdings';
      toast.error(errorMessage);
      return null;
    }
  }, [session?.access_token]);

  // Sync account status
  const syncAccounts = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync-accounts', {});

      if (error) throw error;

      if (data.success) {
        await fetchLinkedAccounts();
        if (data.accounts_errored > 0) {
          toast.warning(`${data.accounts_synced} synced, ${data.accounts_errored} need attention`);
        } else {
          toast.success(`${data.accounts_synced} accounts synced`);
        }
      }
    } catch (err) {
      console.error('Error syncing accounts:', err);
    }
  }, [session?.access_token, fetchLinkedAccounts]);

  // Remove a linked account
  const unlinkAccount = useCallback(async (accountId: string) => {
    if (!session?.user?.id) return false;

    try {
      const { error } = await supabase
        .from('linked_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast.success('Account unlinked');
      await fetchLinkedAccounts();
      return true;
    } catch (err) {
      toast.error('Failed to unlink account');
      return false;
    }
  }, [session?.user?.id, fetchLinkedAccounts]);

  return {
    status,
    linkedAccounts,
    accountsLoading,
    initializePlaidLink,
    exchangePublicToken,
    fetchLinkedAccounts,
    syncHoldings,
    syncAccounts,
    unlinkAccount,
  };
}
