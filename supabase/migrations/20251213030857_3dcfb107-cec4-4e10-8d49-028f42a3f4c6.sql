-- Allow partners to view each other's holdings for household view
CREATE POLICY "Partners can view each other's holdings"
  ON public.holdings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_links
      WHERE (partner_links.user_id = auth.uid() AND partner_links.partner_id = holdings.user_id)
         OR (partner_links.partner_id = auth.uid() AND partner_links.user_id = holdings.user_id)
    )
  );