import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Holding, AccountType, AssetClass } from '@/types/portfolio';

type ViewMode = 'individual' | 'partner' | 'household';
type RelationshipType = 'spouse' | 'partner' | 'financial-partner';
type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Partner {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  relationshipType: RelationshipType;
}

export interface PartnerInvitation {
  id: string;
  inviterId: string;
  inviteeEmail: string;
  relationshipType: RelationshipType;
  status: InvitationStatus;
  message?: string;
  expiresAt: string;
  createdAt: string;
}

interface DbHolding {
  id: string;
  user_id: string;
  ticker: string;
  name: string | null;
  shares: number;
  current_price: number;
  cost_basis: number | null;
  account_type: string | null;
  asset_class: string | null;
  expense_ratio: number | null;
}

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

export function usePartner() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerHoldings, setPartnerHoldings] = useState<Holding[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PartnerInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<PartnerInvitation[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('individual');
  const [loading, setLoading] = useState(true);

  // Fetch partner link and invitations
  const fetchPartnerData = useCallback(async () => {
    if (!user) {
      setPartner(null);
      setPendingInvitations([]);
      setSentInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch partner link
      const { data: links, error: linkError } = await supabase
        .from('partner_links')
        .select('*')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .limit(1);

      if (linkError) throw linkError;

      if (links && links.length > 0) {
        const link = links[0];
        const partnerId = link.user_id === user.id ? link.partner_id : link.user_id;
        
        // Fetch partner profile
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', partnerId)
          .single();

        if (partnerProfile) {
          setPartner({
            id: partnerProfile.id,
            name: partnerProfile.name || 'Partner',
            email: '', // We don't expose email from profiles
            relationshipType: link.relationship_type as RelationshipType,
          });
        }
      } else {
        setPartner(null);
      }

      // Fetch pending invitations sent to this user
      const { data: received } = await supabase
        .from('partner_invitations')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (received) {
        // Filter to invitations for this user's email
        const userInvitations = received.filter(
          inv => inv.invitee_email === user.email && inv.inviter_id !== user.id
        );
        setPendingInvitations(userInvitations.map(inv => ({
          id: inv.id,
          inviterId: inv.inviter_id,
          inviteeEmail: inv.invitee_email,
          relationshipType: inv.relationship_type as RelationshipType,
          status: inv.status as InvitationStatus,
          message: inv.message,
          expiresAt: inv.expires_at,
          createdAt: inv.created_at,
        })));
      }

      // Fetch invitations sent by this user
      const { data: sent } = await supabase
        .from('partner_invitations')
        .select('*')
        .eq('inviter_id', user.id);

      if (sent) {
        setSentInvitations(sent.map(inv => ({
          id: inv.id,
          inviterId: inv.inviter_id,
          inviteeEmail: inv.invitee_email,
          relationshipType: inv.relationship_type as RelationshipType,
          status: inv.status as InvitationStatus,
          message: inv.message,
          expiresAt: inv.expires_at,
          createdAt: inv.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching partner data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPartnerData();
  }, [fetchPartnerData]);

  // Send partner invitation
  const sendInvitation = async (
    email: string, 
    relationshipType: RelationshipType = 'partner',
    message?: string
  ) => {
    if (!user) {
      toast.error('Please sign in to invite a partner');
      return { error: new Error('Not authenticated') };
    }

    if (email === user.email) {
      toast.error("You can't invite yourself");
      return { error: new Error('Cannot invite self') };
    }

    try {
      const { error } = await supabase
        .from('partner_invitations')
        .insert({
          inviter_id: user.id,
          invitee_email: email,
          relationship_type: relationshipType,
          message,
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${email}`);
      await fetchPartnerData();
      return { error: null };
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Failed to send invitation');
      return { error };
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitationId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('partner_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('partner_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Create partner link (both directions)
      const { error: linkError1 } = await supabase
        .from('partner_links')
        .insert({
          user_id: user.id,
          partner_id: invitation.inviter_id,
          relationship_type: invitation.relationship_type,
          invitation_id: invitationId,
        });

      if (linkError1) throw linkError1;

      const { error: linkError2 } = await supabase
        .from('partner_links')
        .insert({
          user_id: invitation.inviter_id,
          partner_id: user.id,
          relationship_type: invitation.relationship_type,
          invitation_id: invitationId,
        });

      if (linkError2) throw linkError2;

      toast.success('Partner invitation accepted!');
      await fetchPartnerData();
      return { error: null };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
      return { error };
    }
  };

  // Decline invitation
  const declineInvitation = async (invitationId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('partner_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation declined');
      await fetchPartnerData();
      return { error: null };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast.error(error.message || 'Failed to decline invitation');
      return { error };
    }
  };

  // Cancel sent invitation
  const cancelInvitation = async (invitationId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('partner_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('inviter_id', user.id);

      if (error) throw error;

      toast.success('Invitation cancelled');
      await fetchPartnerData();
      return { error: null };
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error(error.message || 'Failed to cancel invitation');
      return { error };
    }
  };

  // Remove partner link
  const removePartner = async () => {
    if (!user || !partner) return { error: new Error('No partner to remove') };

    try {
      const { error } = await supabase
        .from('partner_links')
        .delete()
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`);

      if (error) throw error;

      toast.success('Partner removed');
      setPartner(null);
      setCurrentView('individual');
      return { error: null };
    } catch (error: any) {
      console.error('Error removing partner:', error);
      toast.error(error.message || 'Failed to remove partner');
      return { error };
    }
  };

  // Fetch partner holdings (for household view)
  const fetchPartnerHoldings = useCallback(async () => {
    if (!partner?.id) {
      setPartnerHoldings([]);
      return;
    }

    try {
      // Note: This requires RLS policy to allow viewing partner's holdings
      // For now, we'll create an edge function or use a service role for this
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', partner.id);

      if (error) {
        console.error('Error fetching partner holdings:', error);
        setPartnerHoldings([]);
        return;
      }

      setPartnerHoldings((data || []).map(transformHolding));
    } catch (error) {
      console.error('Error fetching partner holdings:', error);
      setPartnerHoldings([]);
    }
  }, [partner?.id]);

  // Fetch partner holdings when partner changes or view mode changes to household
  useEffect(() => {
    if (partner && currentView === 'household') {
      fetchPartnerHoldings();
    }
  }, [partner, currentView, fetchPartnerHoldings]);

  // Set sample partner data (for demo purposes)
  const setSamplePartner = useCallback((samplePartner: Partner, sampleHoldings: Holding[]) => {
    setPartner(samplePartner);
    setPartnerHoldings(sampleHoldings);
  }, []);

  // Clear sample partner data
  const clearSamplePartner = useCallback(() => {
    if (partner?.id === 'sample-partner-id') {
      setPartner(null);
      setPartnerHoldings([]);
      setCurrentView('individual');
    }
  }, [partner?.id]);

  return {
    partner,
    partnerHoldings,
    pendingInvitations,
    sentInvitations,
    currentView,
    setCurrentView,
    loading,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
    removePartner,
    refetch: fetchPartnerData,
    fetchPartnerHoldings,
    setSamplePartner,
    clearSamplePartner,
  };
}
