import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Holding, AccountType, AssetClass } from '@/types/portfolio';

interface DbHolding {
  id: string;
  user_id: string;
  account_id: string | null;
  ticker: string;
  name: string | null;
  shares: number;
  current_price: number;
  cost_basis: number | null;
  account_type: string | null;
  asset_class: string | null;
  expense_ratio: number | null;
  sector: string | null;
  is_manual_entry: boolean;
  last_updated: string;
  created_at: string;
}

export function useHoldings() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transform database holding to app holding
  const transformHolding = (dbHolding: DbHolding): Holding => ({
    id: dbHolding.id,
    ticker: dbHolding.ticker,
    name: dbHolding.name || dbHolding.ticker,
    shares: dbHolding.shares,
    currentPrice: dbHolding.current_price,
    costBasis: dbHolding.cost_basis || dbHolding.current_price,
    accountType: (dbHolding.account_type as AccountType) || 'Taxable',
    assetClass: (dbHolding.asset_class as AssetClass) || 'US Stocks',
    expenseRatio: dbHolding.expense_ratio || undefined,
  });

  // Fetch holdings from database
  const fetchHoldings = useCallback(async () => {
    if (!user?.id) {
      setHoldings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('ticker', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedHoldings = (data as DbHolding[] || []).map(transformHolding);
      setHoldings(transformedHoldings);
    } catch (err) {
      console.error('Error fetching holdings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holdings');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Save a new holding
  const addHolding = useCallback(async (holding: Omit<Holding, 'id'>) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('holdings')
        .insert({
          user_id: user.id,
          ticker: holding.ticker,
          name: holding.name,
          shares: holding.shares,
          current_price: holding.currentPrice,
          cost_basis: holding.costBasis,
          account_type: holding.accountType,
          asset_class: holding.assetClass,
          expense_ratio: holding.expenseRatio || null,
          is_manual_entry: true,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newHolding = transformHolding(data as DbHolding);
      setHoldings(prev => [...prev, newHolding]);
      return newHolding;
    } catch (err) {
      console.error('Error adding holding:', err);
      return null;
    }
  }, [user?.id]);

  // Update an existing holding
  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    if (!user?.id) return false;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.ticker !== undefined) dbUpdates.ticker = updates.ticker;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.shares !== undefined) dbUpdates.shares = updates.shares;
      if (updates.currentPrice !== undefined) dbUpdates.current_price = updates.currentPrice;
      if (updates.costBasis !== undefined) dbUpdates.cost_basis = updates.costBasis;
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType;
      if (updates.assetClass !== undefined) dbUpdates.asset_class = updates.assetClass;
      if (updates.expenseRatio !== undefined) dbUpdates.expense_ratio = updates.expenseRatio;
      dbUpdates.last_updated = new Date().toISOString();

      const { error } = await supabase
        .from('holdings')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setHoldings(prev =>
        prev.map(h => (h.id === id ? { ...h, ...updates } : h))
      );
      return true;
    } catch (err) {
      console.error('Error updating holding:', err);
      return false;
    }
  }, [user?.id]);

  // Delete a holding
  const deleteHolding = useCallback(async (id: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setHoldings(prev => prev.filter(h => h.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting holding:', err);
      return false;
    }
  }, [user?.id]);

  // Bulk upsert holdings (for CSV import or Plaid sync)
  const bulkUpsertHoldings = useCallback(async (newHoldings: Omit<Holding, 'id'>[]) => {
    if (!user?.id || newHoldings.length === 0) return false;

    try {
      const dbHoldings = newHoldings.map(h => ({
        user_id: user.id,
        ticker: h.ticker,
        name: h.name,
        shares: h.shares,
        current_price: h.currentPrice,
        cost_basis: h.costBasis,
        account_type: h.accountType,
        asset_class: h.assetClass,
        expense_ratio: h.expenseRatio || null,
        is_manual_entry: true,
      }));

      const { error } = await supabase
        .from('holdings')
        .insert(dbHoldings);

      if (error) throw error;

      await fetchHoldings();
      return true;
    } catch (err) {
      console.error('Error bulk upserting holdings:', err);
      return false;
    }
  }, [user?.id, fetchHoldings]);

  // Clear all manual holdings
  const clearManualHoldings = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('user_id', user.id)
        .eq('is_manual_entry', true);

      if (error) throw error;

      await fetchHoldings();
      return true;
    } catch (err) {
      console.error('Error clearing holdings:', err);
      return false;
    }
  }, [user?.id, fetchHoldings]);

  // Load holdings on mount and when user changes
  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  return {
    holdings,
    loading,
    error,
    fetchHoldings,
    addHolding,
    updateHolding,
    deleteHolding,
    bulkUpsertHoldings,
    clearManualHoldings,
    // For compatibility with existing code that uses local state
    setHoldings,
  };
}
