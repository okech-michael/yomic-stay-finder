CREATE TABLE public.saved_properties (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

CREATE INDEX saved_properties_user_created_idx
  ON public.saved_properties (user_id, created_at DESC);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their saved stays"
  ON public.saved_properties FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can save published verified stays"
  ON public.saved_properties FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND p.listing_status = 'published'
        AND p.verification_status = 'verified'
    )
  );

CREATE POLICY "Members can remove their saved stays"
  ON public.saved_properties FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.saved_properties TO authenticated;
