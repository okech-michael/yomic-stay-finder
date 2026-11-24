ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'property_owner';

CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'KE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.destinations (name, slug, region)
VALUES
  ('Nairobi', 'nairobi', 'Nairobi'),
  ('Mombasa', 'mombasa', 'Coast'),
  ('Kisumu', 'kisumu', 'Nyanza'),
  ('Kisii', 'kisii', 'Gusii'),
  ('Nyamira', 'nyamira', 'Gusii'),
  ('Nakuru', 'nakuru', 'Rift Valley'),
  ('Eldoret', 'eldoret', 'Rift Valley'),
  ('Keroka', 'keroka', 'Gusii'),
  ('Ogembo', 'ogembo', 'Gusii'),
  ('Suneka', 'suneka', 'Gusii')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.properties
  ALTER COLUMN rent DROP NOT NULL,
  ADD COLUMN destination_id UUID REFERENCES public.destinations(id),
  ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN nightly_rate NUMERIC(12, 2),
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'KES',
  ADD COLUMN cleaning_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN max_guests SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN min_nights SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN check_in_time TIME NOT NULL DEFAULT '15:00',
  ADD COLUMN check_out_time TIME NOT NULL DEFAULT '10:00',
  ADD COLUMN house_rules TEXT,
  ADD COLUMN latitude NUMERIC(10, 7),
  ADD COLUMN longitude NUMERIC(10, 7),
  ADD COLUMN listing_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD CONSTRAINT properties_nightly_rate_nonnegative CHECK (nightly_rate IS NULL OR nightly_rate >= 0),
  ADD CONSTRAINT properties_cleaning_fee_nonnegative CHECK (cleaning_fee >= 0),
  ADD CONSTRAINT properties_guest_count_positive CHECK (max_guests > 0),
  ADD CONSTRAINT properties_min_nights_positive CHECK (min_nights > 0),
  ADD CONSTRAINT properties_listing_status_valid CHECK (listing_status IN ('draft', 'pending_review', 'published', 'rejected', 'suspended')),
  ADD CONSTRAINT properties_verification_status_valid CHECK (verification_status IN ('pending', 'verified', 'rejected'));

UPDATE public.properties SET available = FALSE;

CREATE INDEX properties_destination_id_idx ON public.properties (destination_id);
CREATE INDEX properties_owner_id_idx ON public.properties (owner_id);
CREATE INDEX properties_public_short_stay_idx
  ON public.properties (destination_id, nightly_rate)
  WHERE listing_status = 'published' AND verification_status = 'verified';

DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;
CREATE POLICY "Public can view verified published stays"
  ON public.properties FOR SELECT TO anon, authenticated
  USING (listing_status = 'published' AND verification_status = 'verified');
CREATE POLICY "Owners can view their properties"
  ON public.properties FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Owners can create their properties"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role::TEXT = 'property_owner'
    ) AND listing_status = 'draft' AND verification_status = 'pending' AND verified_at IS NULL
  );
CREATE POLICY "Owners can update their properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role::TEXT = 'property_owner'
    )
  )
  WITH CHECK (
    owner_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role::TEXT = 'property_owner'
    )
  );
CREATE TABLE public.property_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  stay_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  nightly_rate_override NUMERIC(12, 2),
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, stay_date),
  CHECK (nightly_rate_override IS NULL OR nightly_rate_override >= 0)
);

CREATE INDEX property_availability_date_idx ON public.property_availability (property_id, stay_date);
ALTER TABLE public.property_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view availability for published stays"
  ON public.property_availability FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.listing_status = 'published' AND p.verification_status = 'verified'
  ));
CREATE POLICY "Owners manage their property availability"
  ON public.property_availability FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.owner_id = auth.uid()
  ));

CREATE TABLE public.platform_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  commission_bps INTEGER CHECK (commission_bps BETWEEN 0 AND 10000),
  commission_bearer TEXT CHECK (commission_bearer IN ('host', 'guest')),
  booking_payment_mode TEXT CHECK (booking_payment_mode IN ('full', 'first_night', 'percentage')),
  booking_payment_percent NUMERIC(5, 2) CHECK (booking_payment_percent BETWEEN 1 AND 100),
  cancellation_policy JSONB,
  enabled_payment_methods TEXT[] NOT NULL DEFAULT ARRAY['mpesa', 'card'],
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (booking_payment_mode = 'percentage' AND booking_payment_percent IS NOT NULL)
    OR (booking_payment_mode IS DISTINCT FROM 'percentage' AND booking_payment_percent IS NULL)
  )
);

INSERT INTO public.platform_settings (singleton) VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights SMALLINT NOT NULL CHECK (nights > 0),
  guest_count SMALLINT NOT NULL CHECK (guest_count > 0),
  nightly_subtotal NUMERIC(12, 2) NOT NULL CHECK (nightly_subtotal >= 0),
  cleaning_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  commission_bearer TEXT NOT NULL CHECK (commission_bearer IN ('host', 'guest')),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'card')),
  cancellation_policy_snapshot JSONB NOT NULL,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'refund_pending', 'refunded')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (amount_due <= total_amount)
);

CREATE INDEX bookings_guest_idx ON public.bookings (guest_id, created_at DESC);
CREATE INDEX bookings_owner_idx ON public.bookings (owner_id, check_in);
CREATE INDEX bookings_property_dates_idx ON public.bookings (property_id, check_in, check_out);

CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  method TEXT NOT NULL CHECK (method IN ('mpesa', 'card')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'partially_refunded', 'refunded')),
  provider_reference TEXT UNIQUE,
  checkout_url TEXT,
  provider_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX booking_payments_booking_idx ON public.booking_payments (booking_id, created_at);

CREATE TABLE public.booking_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL UNIQUE,
  amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid >= 0),
  balance_due NUMERIC(12, 2) NOT NULL CHECK (balance_due >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_data JSONB NOT NULL
);

CREATE TABLE public.booking_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'processed')),
  refund_amount NUMERIC(12, 2) CHECK (refund_amount >= 0),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE public.booking_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.booking_payments(id) ON DELETE RESTRICT,
  cancellation_id UUID REFERENCES public.booking_cancellations(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  provider_reference TEXT,
  reason TEXT NOT NULL,
  admin_note TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE public.booking_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
  commission_amount NUMERIC(12, 2) NOT NULL CHECK (commission_amount >= 0),
  commission_bps INTEGER NOT NULL CHECK (commission_bps BETWEEN 0 AND 10000),
  bearer TEXT NOT NULL CHECK (bearer IN ('host', 'guest')),
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'earned', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.booking_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX booking_messages_conversation_idx ON public.booking_messages (conversation_id, created_at);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
  event_type TEXT NOT NULL,
  recipient TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'read')),
  provider_reference TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.property_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT CHECK (char_length(review_text) <= 3000),
  owner_response TEXT CHECK (char_length(owner_response) <= 3000),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.listing_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX listing_verifications_status_idx ON public.listing_verifications (status, submitted_at);

GRANT SELECT ON public.destinations TO anon, authenticated;
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT INSERT, UPDATE ON public.properties TO authenticated;
GRANT SELECT ON public.property_availability TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.property_availability TO authenticated;
GRANT SELECT, UPDATE ON public.platform_settings TO authenticated;
GRANT SELECT ON public.bookings, public.booking_payments, public.booking_receipts,
  public.booking_cancellations, public.booking_refunds, public.booking_commissions,
  public.booking_conversations, public.booking_messages, public.notifications,
  public.property_reviews, public.listing_verifications TO authenticated;
GRANT INSERT ON public.booking_messages, public.property_reviews, public.listing_verifications TO authenticated;
GRANT UPDATE ON public.booking_messages, public.notifications, public.property_reviews,
  public.listing_verifications TO authenticated;
GRANT SELECT ON public.property_reviews TO anon;
GRANT ALL ON public.destinations, public.property_availability, public.platform_settings,
  public.bookings, public.booking_payments, public.booking_receipts, public.booking_cancellations,
  public.booking_refunds, public.booking_commissions, public.booking_conversations,
  public.booking_messages, public.notifications, public.property_reviews,
  public.listing_verifications TO service_role;

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view properties they have booked"
  ON public.properties FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.property_id = id AND b.guest_id = auth.uid()
  ));
CREATE POLICY "Owners can view guest profiles for their bookings"
  ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.guest_id = profiles.id AND b.owner_id = auth.uid()
  ));
CREATE POLICY "Guests can view host profiles for their bookings"
  ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.owner_id = profiles.id AND b.guest_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active destinations"
  ON public.destinations FOR SELECT TO anon, authenticated USING (is_active);

CREATE POLICY "Guests and hosts can view their bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Booking parties can view payments"
  ON public.booking_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.guest_id = auth.uid() OR b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Guests and admins can view receipts"
  ON public.booking_receipts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.guest_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Booking parties and admins can view cancellations"
  ON public.booking_cancellations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.guest_id = auth.uid() OR b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Booking parties and admins can view refunds"
  ON public.booking_refunds FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.guest_id = auth.uid() OR b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Hosts and admins can view commissions"
  ON public.booking_commissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (b.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Booking participants can view conversations"
  ON public.booking_conversations FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants can view messages"
  ON public.booking_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.booking_conversations c
    WHERE c.id = conversation_id AND (c.guest_id = auth.uid() OR c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Participants can send messages"
  ON public.booking_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.booking_conversations c
      WHERE c.id = conversation_id AND (c.guest_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can mark their notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view published reviews"
  ON public.property_reviews FOR SELECT TO anon, authenticated
  USING (is_published);
CREATE POLICY "Guests can view their own reviews"
  ON public.property_reviews FOR SELECT TO authenticated
  USING (guest_id = auth.uid());
CREATE POLICY "Guests can review completed bookings"
  ON public.property_reviews FOR INSERT TO authenticated
  WITH CHECK (
    guest_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.property_id = property_reviews.property_id
        AND b.guest_id = auth.uid() AND b.status = 'completed'
    )
  );
CREATE POLICY "Owners can respond to their property reviews"
  ON public.property_reviews FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Owners and admins can view listing verification"
  ON public.listing_verifications FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Owners can request listing verification"
  ON public.listing_verifications FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage listing verification"
  ON public.listing_verifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_owner_listing_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.owner_id = auth.uid()
      AND NOT public.has_role(auth.uid(), 'admin')
      AND current_setting('umoja.allow_listing_state_change', TRUE) IS DISTINCT FROM 'on'
      AND (
        NEW.owner_id IS DISTINCT FROM OLD.owner_id
        OR NEW.listing_status IS DISTINCT FROM OLD.listing_status
        OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
        OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
      ) THEN
    RAISE EXCEPTION 'LISTING_STATE_REQUIRES_REVIEW';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER properties_protect_owner_state
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_listing_state();

CREATE OR REPLACE FUNCTION public.request_property_owner_role()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'property_owner')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.request_property_owner_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_property_owner_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_listing_verification(p_property_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verification_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = auth.uid()
      AND nightly_rate IS NOT NULL AND destination_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'LISTING_NOT_READY_FOR_VERIFICATION';
  END IF;
  PERFORM set_config('umoja.allow_listing_state_change', 'on', TRUE);
  UPDATE public.properties
  SET listing_status = 'pending_review',
      verification_status = 'pending',
      verified_at = NULL,
      updated_at = now()
  WHERE id = p_property_id;
  INSERT INTO public.listing_verifications (property_id, submitted_by)
  VALUES (p_property_id, auth.uid())
  RETURNING id INTO v_verification_id;
  RETURN v_verification_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_listing_verification(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_listing_verification(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.unavailable_property_ids(
  p_property_ids UUID[],
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE (property_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT p.id
  FROM public.properties p
  WHERE p.id = ANY(p_property_ids)
    AND (
      EXISTS (
        SELECT 1 FROM public.property_availability a
        WHERE a.property_id = p.id
          AND a.stay_date >= p_check_in
          AND a.stay_date < p_check_out
          AND a.is_available = FALSE
      )
      OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.property_id = p.id
          AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
          AND (b.status <> 'pending_payment' OR b.expires_at > now())
          AND b.check_in < p_check_out
          AND b.check_out > p_check_in
      )
    );
$$;
REVOKE ALL ON FUNCTION public.unavailable_property_ids(UUID[], DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unavailable_property_ids(UUID[], DATE, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_platform_counts()
RETURNS TABLE (
  listed BIGINT,
  available BIGINT,
  confirmed_bookings BIGINT,
  destinations BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT count(*) FROM public.properties
      WHERE listing_status = 'published' AND verification_status = 'verified'),
    (SELECT count(*) FROM public.properties
      WHERE listing_status = 'published' AND verification_status = 'verified'),
    (SELECT count(*) FROM public.bookings
      WHERE status IN ('confirmed', 'checked_in', 'completed')),
    (SELECT count(*) FROM public.destinations WHERE is_active);
$$;
REVOKE ALL ON FUNCTION public.get_public_platform_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_counts() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guest_count SMALLINT,
  p_payment_method TEXT,
  p_special_requests TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_guest_id UUID := auth.uid();
  v_owner_id UUID;
  v_currency CHAR(3);
  v_base_rate NUMERIC(12, 2);
  v_cleaning_fee NUMERIC(12, 2);
  v_min_nights SMALLINT;
  v_max_guests SMALLINT;
  v_nights INTEGER;
  v_subtotal NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_commission NUMERIC(12, 2);
  v_amount_due NUMERIC(12, 2);
  v_commission_bps INTEGER;
  v_commission_bearer TEXT;
  v_payment_mode TEXT;
  v_payment_percent NUMERIC(5, 2);
  v_policy JSONB;
  v_enabled_methods TEXT[];
  v_available BOOLEAN;
  v_booking_id UUID;
  v_reference TEXT;
BEGIN
  IF v_guest_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;
  IF p_check_in < CURRENT_DATE OR p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'INVALID_STAY_DATES';
  END IF;
  IF p_guest_count < 1 OR char_length(COALESCE(p_special_requests, '')) > 2000 THEN
    RAISE EXCEPTION 'INVALID_GUEST_DETAILS';
  END IF;

  SELECT commission_bps, commission_bearer, booking_payment_mode,
         booking_payment_percent, cancellation_policy, enabled_payment_methods
    INTO v_commission_bps, v_commission_bearer, v_payment_mode,
         v_payment_percent, v_policy, v_enabled_methods
    FROM public.platform_settings WHERE singleton = TRUE;
  IF v_commission_bps IS NULL OR v_commission_bearer IS NULL
      OR v_payment_mode IS NULL OR v_policy IS NULL THEN
    RAISE EXCEPTION 'BOOKING_POLICIES_NOT_CONFIGURED';
  END IF;
  IF NOT (p_payment_method = ANY(v_enabled_methods)) THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_ENABLED';
  END IF;

  PERFORM pg_advisory_xact_lock(827341, hashtext(p_property_id::TEXT));
  SELECT owner_id, currency, nightly_rate, cleaning_fee, min_nights, max_guests
    INTO v_owner_id, v_currency, v_base_rate, v_cleaning_fee, v_min_nights, v_max_guests
    FROM public.properties
    WHERE id = p_property_id
      AND listing_status = 'published'
      AND verification_status = 'verified'
      AND owner_id IS NOT NULL
    FOR SHARE;
  IF NOT FOUND OR v_base_rate IS NULL THEN
    RAISE EXCEPTION 'STAY_NOT_BOOKABLE';
  END IF;
  IF v_owner_id = v_guest_id THEN
    RAISE EXCEPTION 'CANNOT_BOOK_OWN_LISTING';
  END IF;
  IF p_guest_count > v_max_guests THEN
    RAISE EXCEPTION 'GUEST_COUNT_EXCEEDS_PROPERTY_LIMIT';
  END IF;

  v_nights := p_check_out - p_check_in;
  IF v_nights < v_min_nights THEN
    RAISE EXCEPTION 'MINIMUM_STAY_NOT_MET';
  END IF;

  SELECT
    COALESCE(bool_and(COALESCE(a.is_available, TRUE)), FALSE),
    COALESCE(SUM(COALESCE(a.nightly_rate_override, v_base_rate)), 0)
    INTO v_available, v_subtotal
    FROM generate_series(p_check_in, p_check_out - 1, INTERVAL '1 day') AS d(stay_date)
    LEFT JOIN public.property_availability a
      ON a.property_id = p_property_id AND a.stay_date = d.stay_date::DATE;
  IF NOT v_available OR v_subtotal <= 0 THEN
    RAISE EXCEPTION 'DATES_UNAVAILABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.property_id = p_property_id
      AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
      AND (b.status <> 'pending_payment' OR b.expires_at > now())
      AND b.check_in < p_check_out AND b.check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'DATES_ALREADY_BOOKED';
  END IF;

  v_total := v_subtotal + v_cleaning_fee;
  v_commission := round(v_total * v_commission_bps / 10000.0, 2);
  IF v_commission_bearer = 'guest' THEN
    v_total := v_total + v_commission;
  END IF;
  v_amount_due := CASE v_payment_mode
    WHEN 'full' THEN v_total
    WHEN 'first_night' THEN LEAST(
      v_total,
      COALESCE((
        SELECT COALESCE(a.nightly_rate_override, v_base_rate)
        FROM public.property_availability a
        WHERE a.property_id = p_property_id AND a.stay_date = p_check_in
      ), v_base_rate) + v_cleaning_fee
      + CASE WHEN v_commission_bearer = 'guest' THEN v_commission ELSE 0 END
    )
    WHEN 'percentage' THEN round(v_total * v_payment_percent / 100.0, 2)
  END;

  v_reference := 'YS-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12));
  INSERT INTO public.bookings (
    booking_reference, property_id, guest_id, owner_id, check_in, check_out,
    nights, guest_count, nightly_subtotal, cleaning_fee, commission_amount,
    commission_bearer, total_amount, amount_due, currency, payment_method,
    cancellation_policy_snapshot, special_requests, expires_at
  ) VALUES (
    v_reference, p_property_id, v_guest_id, v_owner_id, p_check_in, p_check_out,
    v_nights, p_guest_count, v_subtotal, v_cleaning_fee, v_commission,
    v_commission_bearer, v_total, v_amount_due, v_currency, p_payment_method,
    v_policy, NULLIF(p_special_requests, ''), now() + INTERVAL '20 minutes'
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_payments (booking_id, amount, currency, method)
  VALUES (v_booking_id, v_amount_due, v_currency, p_payment_method);
  INSERT INTO public.booking_commissions (
    booking_id, gross_amount, commission_amount, commission_bps, bearer, currency
  ) VALUES (
    v_booking_id, v_total, v_commission, v_commission_bps, v_commission_bearer, v_currency
  );
  INSERT INTO public.booking_conversations (booking_id, guest_id, owner_id)
  VALUES (v_booking_id, v_guest_id, v_owner_id);
  RETURN v_booking_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(UUID, DATE, DATE, SMALLINT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(UUID, DATE, DATE, SMALLINT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_update_booking_status(
  p_booking_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
  v_current_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;
  SELECT owner_id, status INTO v_owner_id, v_current_status
  FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT ((v_current_status = 'confirmed' AND p_status = 'checked_in')
      OR (v_current_status = 'checked_in' AND p_status = 'completed')) THEN
    RAISE EXCEPTION 'INVALID_BOOKING_STATUS_TRANSITION';
  END IF;
  UPDATE public.bookings SET status = p_status, updated_at = now() WHERE id = p_booking_id;
END;
$$;
REVOKE ALL ON FUNCTION public.owner_update_booking_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_booking_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.guest_cancel_booking(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_guest_id UUID;
  v_status TEXT;
  v_cancellation_id UUID;
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 2 AND 1000 THEN
    RAISE EXCEPTION 'INVALID_CANCELLATION_REQUEST';
  END IF;
  SELECT guest_id, status INTO v_guest_id, v_status
  FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_guest_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_status NOT IN ('pending_payment', 'confirmed') THEN
    RAISE EXCEPTION 'BOOKING_CANNOT_BE_CANCELLED';
  END IF;
  INSERT INTO public.booking_cancellations (booking_id, requested_by, reason, status)
  VALUES (
    p_booking_id,
    auth.uid(),
    trim(p_reason),
    CASE WHEN v_status = 'pending_payment' THEN 'approved' ELSE 'requested' END
  )
  RETURNING id INTO v_cancellation_id;
  IF v_status = 'pending_payment' THEN
    UPDATE public.bookings SET status = 'cancelled', updated_at = now() WHERE id = p_booking_id;
  END IF;
  RETURN v_cancellation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.guest_cancel_booking(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guest_cancel_booking(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_refund(
  p_refund_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_REFUND_DECISION';
  END IF;
  UPDATE public.booking_refunds
  SET status = p_status,
      admin_note = p_note,
      processed_by = auth.uid(),
      processed_at = now()
  WHERE id = p_refund_id AND status = 'requested';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_REQUEST_NOT_FOUND';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_refund(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_refund(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_listing(
  p_property_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS';
  END IF;
  UPDATE public.listing_verifications
  SET status = p_status,
      admin_note = p_note,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = (
    SELECT id FROM public.listing_verifications
    WHERE property_id = p_property_id AND status = 'pending'
    ORDER BY submitted_at DESC
    LIMIT 1
  );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PENDING_VERIFICATION_NOT_FOUND';
  END IF;
  UPDATE public.properties
  SET verification_status = CASE WHEN p_status = 'approved' THEN 'verified' ELSE 'rejected' END,
      listing_status = CASE WHEN p_status = 'approved' THEN 'published' ELSE 'rejected' END,
      verified_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_property_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_listing(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_listing(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_booking_payment(
  p_payment_id UUID,
  p_provider_reference TEXT,
  p_paid_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_paid_total NUMERIC(12, 2);
  v_receipt_id UUID;
  v_confirmed BOOLEAN := FALSE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO v_payment FROM public.booking_payments
  WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.status <> 'processing' THEN
    RAISE EXCEPTION 'PAYMENT_NOT_PROCESSABLE';
  END IF;
  UPDATE public.booking_payments
  SET status = 'succeeded',
      provider_reference = p_provider_reference,
      paid_at = p_paid_at,
      updated_at = now()
  WHERE id = p_payment_id;
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = v_payment.booking_id FOR UPDATE;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_total
  FROM public.booking_payments
  WHERE booking_id = v_booking.id AND status = 'succeeded';
  IF v_paid_total >= v_booking.amount_due
      AND v_booking.status = 'pending_payment'
      AND v_booking.expires_at > now() THEN
    UPDATE public.bookings
    SET status = 'confirmed', expires_at = NULL, updated_at = now()
    WHERE id = v_booking.id AND status = 'pending_payment';
    UPDATE public.booking_commissions
    SET status = 'earned'
    WHERE booking_id = v_booking.id;
    v_confirmed := TRUE;
  ELSIF v_booking.expires_at <= now() THEN
    UPDATE public.bookings
    SET status = 'refund_pending', updated_at = now()
    WHERE id = v_booking.id AND status = 'pending_payment';
    INSERT INTO public.booking_refunds (booking_id, payment_id, amount, reason)
    VALUES (v_booking.id, v_payment.id, v_payment.amount, 'Payment received after booking hold expired');
  END IF;
  INSERT INTO public.booking_receipts (
    booking_id, receipt_number, amount_paid, balance_due, currency, receipt_data
  ) VALUES (
    v_booking.id,
    'RCPT-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12)),
    v_paid_total,
    greatest(v_booking.total_amount - v_paid_total, 0),
    v_booking.currency,
    jsonb_build_object(
      'booking_reference', v_booking.booking_reference,
      'property_id', v_booking.property_id,
      'check_in', v_booking.check_in,
      'check_out', v_booking.check_out,
      'nights', v_booking.nights,
      'guest_count', v_booking.guest_count
    )
  )
  ON CONFLICT (booking_id) DO UPDATE
    SET amount_paid = EXCLUDED.amount_paid,
        balance_due = EXCLUDED.balance_due,
        receipt_data = EXCLUDED.receipt_data
  RETURNING id INTO v_receipt_id;
  INSERT INTO public.notifications (user_id, booking_id, channel, event_type, body)
  VALUES
    (
      v_booking.guest_id,
      v_booking.id,
      'in_app',
      CASE WHEN v_confirmed THEN 'booking_confirmed' ELSE 'payment_received' END,
      CASE WHEN v_confirmed THEN 'Your stay booking is confirmed.' ELSE 'We received a payment update for your stay.' END
    ),
    (
      v_booking.owner_id,
      v_booking.id,
      'in_app',
      CASE WHEN v_confirmed THEN 'booking_received' ELSE 'payment_received' END,
      CASE WHEN v_confirmed THEN 'You have a new guest booking.' ELSE 'A guest payment was received.' END
    );
  RETURN v_receipt_id;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_booking_payment(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_payment(UUID, TEXT, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('pending_payment', 'confirmed', 'checked_in') THEN
    PERFORM pg_advisory_xact_lock(827341, hashtext(NEW.property_id::TEXT));
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.property_id = NEW.property_id
        AND b.id IS DISTINCT FROM NEW.id
        AND b.status IN ('pending_payment', 'confirmed', 'checked_in')
        AND (b.status <> 'pending_payment' OR b.expires_at > now())
        AND b.check_in < NEW.check_out AND b.check_out > NEW.check_in
    ) THEN
      RAISE EXCEPTION 'DATES_ALREADY_BOOKED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_prevent_overlap
  BEFORE INSERT OR UPDATE OF property_id, check_in, check_out, status
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();
