-- Create partner invitation status enum
CREATE TYPE public.partner_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create partner relationship type enum
CREATE TYPE public.partner_relationship_type AS ENUM ('spouse', 'partner', 'financial-partner');

-- Create partner invitations table
CREATE TABLE public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  relationship_type partner_relationship_type NOT NULL DEFAULT 'partner',
  status partner_invitation_status NOT NULL DEFAULT 'pending',
  message TEXT,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner links table (established partnerships)
CREATE TABLE public.partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type partner_relationship_type NOT NULL DEFAULT 'partner',
  invitation_id UUID REFERENCES public.partner_invitations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

-- Enable RLS
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_invitations
CREATE POLICY "Users can view invitations they sent"
  ON public.partner_invitations FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view invitations sent to their email"
  ON public.partner_invitations FOR SELECT
  USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations"
  ON public.partner_invitations FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their sent invitations"
  ON public.partner_invitations FOR UPDATE
  USING (auth.uid() = inviter_id);

CREATE POLICY "Invitees can update invitation status"
  ON public.partner_invitations FOR UPDATE
  USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their sent invitations"
  ON public.partner_invitations FOR DELETE
  USING (auth.uid() = inviter_id);

-- RLS Policies for partner_links
CREATE POLICY "Users can view their partner links"
  ON public.partner_links FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create partner links"
  ON public.partner_links FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete their partner links"
  ON public.partner_links FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Trigger for updated_at
CREATE TRIGGER update_partner_invitations_updated_at
  BEFORE UPDATE ON public.partner_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();