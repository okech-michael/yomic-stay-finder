UPDATE public.external_listings
SET is_active = FALSE
WHERE is_active;

DROP POLICY IF EXISTS external_listings_read_active ON public.external_listings;
REVOKE ALL ON TABLE public.external_listings FROM anon, authenticated;
