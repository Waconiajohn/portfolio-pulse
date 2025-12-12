import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GuaranteedIncomeSource, GuaranteedIncomeSourceType } from '@/types/portfolio';

interface DbIncomeSource {
  id: string;
  user_id: string;
  source_name: string;
  source_type: string;
  monthly_amount: number;
  start_age: number;
  inflation_adj: boolean;
  guaranteed_for_life: boolean;
  created_at: string;
  updated_at: string;
}

export function useIncomeSources() {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<GuaranteedIncomeSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transform database record to app type
  const transformSource = (db: DbIncomeSource): GuaranteedIncomeSource => ({
    id: db.id,
    sourceName: db.source_name,
    sourceType: db.source_type as GuaranteedIncomeSourceType,
    monthlyAmount: db.monthly_amount,
    startAge: db.start_age,
    inflationAdj: db.inflation_adj,
    guaranteedForLife: db.guaranteed_for_life,
  });

  // Fetch income sources from database
  const fetchIncomeSources = useCallback(async () => {
    if (!user?.id) {
      setIncomeSources([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('start_age', { ascending: true });

      if (fetchError) throw fetchError;

      const transformed = (data as DbIncomeSource[] || []).map(transformSource);
      setIncomeSources(transformed);
    } catch (err) {
      console.error('Error fetching income sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch income sources');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Add a new income source
  const addIncomeSource = useCallback(async (source: Omit<GuaranteedIncomeSource, 'id'>) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('income_sources')
        .insert({
          user_id: user.id,
          source_name: source.sourceName,
          source_type: source.sourceType,
          monthly_amount: source.monthlyAmount,
          start_age: source.startAge,
          inflation_adj: source.inflationAdj,
          guaranteed_for_life: source.guaranteedForLife,
        })
        .select()
        .single();

      if (error) throw error;

      const newSource = transformSource(data as DbIncomeSource);
      setIncomeSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err) {
      console.error('Error adding income source:', err);
      return null;
    }
  }, [user?.id]);

  // Update an income source
  const updateIncomeSource = useCallback(async (id: string, updates: Partial<Omit<GuaranteedIncomeSource, 'id'>>) => {
    if (!user?.id) return false;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.sourceName !== undefined) dbUpdates.source_name = updates.sourceName;
      if (updates.sourceType !== undefined) dbUpdates.source_type = updates.sourceType;
      if (updates.monthlyAmount !== undefined) dbUpdates.monthly_amount = updates.monthlyAmount;
      if (updates.startAge !== undefined) dbUpdates.start_age = updates.startAge;
      if (updates.inflationAdj !== undefined) dbUpdates.inflation_adj = updates.inflationAdj;
      if (updates.guaranteedForLife !== undefined) dbUpdates.guaranteed_for_life = updates.guaranteedForLife;

      const { error } = await supabase
        .from('income_sources')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setIncomeSources(prev =>
        prev.map(s => (s.id === id ? { ...s, ...updates } : s))
      );
      return true;
    } catch (err) {
      console.error('Error updating income source:', err);
      return false;
    }
  }, [user?.id]);

  // Delete an income source
  const deleteIncomeSource = useCallback(async (id: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setIncomeSources(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting income source:', err);
      return false;
    }
  }, [user?.id]);

  // Load on mount
  useEffect(() => {
    fetchIncomeSources();
  }, [fetchIncomeSources]);

  return {
    incomeSources,
    loading,
    error,
    fetchIncomeSources,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    setIncomeSources,
  };
}
