
-- 1. Link buyers to auth users
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE INDEX IF NOT EXISTS buyers_auth_user_id_idx ON public.buyers(auth_user_id);

-- Helper: current auth user's buyer_id
CREATE OR REPLACE FUNCTION public.current_buyer_id()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.buyers WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Buyer invites (manager issues, buyer redeems on signup)
CREATE TABLE IF NOT EXISTS public.buyer_invites (
  id bigserial PRIMARY KEY,
  buyer_id bigint NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  email text,
  phone text,
  redeemed_at timestamptz,
  redeemed_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_invites TO authenticated;
GRANT SELECT ON public.buyer_invites TO anon;
GRANT ALL ON public.buyer_invites TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.buyer_invites_id_seq TO authenticated, anon, service_role;
ALTER TABLE public.buyer_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager manages own invites" ON public.buyer_invites
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "anon can look up invite by token" ON public.buyer_invites
  FOR SELECT TO anon USING (true);

-- 3. Buyer notifications
CREATE TABLE IF NOT EXISTS public.buyer_notifications (
  id bigserial PRIMARY KEY,
  buyer_id bigint NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hp_id bigint,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_notifications TO authenticated;
GRANT ALL ON public.buyer_notifications TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.buyer_notifications_id_seq TO authenticated, service_role;
ALTER TABLE public.buyer_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager manages own notifications" ON public.buyer_notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyer reads own notifications" ON public.buyer_notifications
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY "buyer marks own notifications read" ON public.buyer_notifications
  FOR UPDATE TO authenticated USING (buyer_id = public.current_buyer_id()) WITH CHECK (buyer_id = public.current_buyer_id());

-- 4. Buyer documents
CREATE TABLE IF NOT EXISTS public.buyer_documents (
  id bigserial PRIMARY KEY,
  buyer_id bigint NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hp_id bigint,
  title text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_documents TO authenticated;
GRANT ALL ON public.buyer_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.buyer_documents_id_seq TO authenticated, service_role;
ALTER TABLE public.buyer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager manages own documents" ON public.buyer_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyer reads own documents" ON public.buyer_documents
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());

-- 5. Manager announcements (per-buyer or broadcast to all this manager's buyers)
CREATE TABLE IF NOT EXISTS public.announcements (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  buyer_id bigint,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.announcements_id_seq TO authenticated, service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager manages own announcements" ON public.announcements
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyer reads relevant announcements" ON public.announcements
  FOR SELECT TO authenticated USING (
    buyer_id = public.current_buyer_id()
    OR (buyer_id IS NULL AND user_id IN (SELECT user_id FROM public.buyers WHERE id = public.current_buyer_id()))
  );

-- 6. Buyer-side read policies on existing tables (additive; manager policies untouched)
CREATE POLICY "buyer reads own hp" ON public.hp
  FOR SELECT TO authenticated USING (buyer_id = public.current_buyer_id());
CREATE POLICY "buyer reads own payments" ON public.payments
  FOR SELECT TO authenticated USING (
    hp_id IN (SELECT id FROM public.hp WHERE buyer_id = public.current_buyer_id())
  );
CREATE POLICY "buyer reads own cars" ON public.cars
  FOR SELECT TO authenticated USING (
    id IN (SELECT car_id FROM public.hp WHERE buyer_id = public.current_buyer_id())
  );
CREATE POLICY "buyer reads own profile" ON public.buyers
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "buyer reads own payment proofs" ON public.payment_proofs
  FOR SELECT TO authenticated USING (
    hp_id IN (SELECT id FROM public.hp WHERE buyer_id = public.current_buyer_id())
  );

-- 7. Trigger: manager records a payment -> notify the buyer
CREATE OR REPLACE FUNCTION public.notify_buyer_on_payment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _buyer_id bigint;
BEGIN
  SELECT buyer_id INTO _buyer_id FROM public.hp WHERE id = NEW.hp_id;
  IF _buyer_id IS NOT NULL THEN
    INSERT INTO public.buyer_notifications(buyer_id, user_id, hp_id, kind, title, body)
    VALUES (
      _buyer_id, NEW.user_id, NEW.hp_id, 'payment',
      'Payment recorded',
      'A payment of UGX ' || to_char(NEW.amount, 'FM999,999,999') || ' was recorded on ' || NEW.date::text || '.'
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_buyer_on_payment ON public.payments;
CREATE TRIGGER trg_notify_buyer_on_payment
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_on_payment();
