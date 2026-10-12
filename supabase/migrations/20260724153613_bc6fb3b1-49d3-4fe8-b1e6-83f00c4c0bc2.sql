
-- 1. Unique email per manager (case-insensitive), only when set
CREATE UNIQUE INDEX IF NOT EXISTS buyers_user_email_unique_idx
  ON public.buyers (user_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- 2. Buyer status
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 3. Receipts table (auto-generated from payments)
CREATE TABLE IF NOT EXISTS public.receipts (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id bigint NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  hp_id bigint NOT NULL REFERENCES public.hp(id) ON DELETE CASCADE,
  buyer_id bigint REFERENCES public.buyers(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.receipts_id_seq TO authenticated;
GRANT ALL ON public.receipts TO service_role;
GRANT ALL ON SEQUENCE public.receipts_id_seq TO service_role;

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager manages own receipts" ON public.receipts;
CREATE POLICY "manager manages own receipts" ON public.receipts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "buyer reads own receipts" ON public.receipts;
CREATE POLICY "buyer reads own receipts" ON public.receipts
  FOR SELECT TO authenticated
  USING (buyer_id = public.current_buyer_id());

-- 4. Auto-generate a receipt on every payment
CREATE OR REPLACE FUNCTION public.generate_receipt_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer_id bigint;
  _selling numeric;
  _interest numeric;
  _deposit numeric;
  _paid numeric;
  _total_due numeric;
  _balance numeric;
  _receipt_no text;
BEGIN
  SELECT buyer_id, selling_price, interest, deposit
    INTO _buyer_id, _selling, _interest, _deposit
    FROM public.hp WHERE id = NEW.hp_id;

  SELECT COALESCE(SUM(amount), 0) INTO _paid
    FROM public.payments WHERE hp_id = NEW.hp_id;

  _total_due := _selling + (_selling * COALESCE(_interest,0) / 100.0);
  _balance   := GREATEST(0, _total_due - COALESCE(_deposit,0) - _paid);
  _receipt_no := 'RCPT-' || to_char(now(), 'YYYYMMDD') || '-' || NEW.id::text;

  INSERT INTO public.receipts(user_id, payment_id, hp_id, buyer_id, receipt_number,
                              amount, balance_after, method, date, notes)
  VALUES (NEW.user_id, NEW.id, NEW.hp_id, _buyer_id, _receipt_no,
          NEW.amount, _balance, NEW.method, NEW.date, NEW.notes)
  ON CONFLICT (payment_id) DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_receipt_on_payment ON public.payments;
CREATE TRIGGER trg_generate_receipt_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_receipt_on_payment();

-- 5. Buyer can read the cars assigned to them (via their HP)
DROP POLICY IF EXISTS "buyer reads own cars" ON public.cars;
CREATE POLICY "buyer reads own cars" ON public.cars
  FOR SELECT TO authenticated
  USING (id IN (SELECT car_id FROM public.hp WHERE buyer_id = public.current_buyer_id()));

-- 6. Realtime for receipts
ALTER TABLE public.receipts REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 7. Backfill receipts for any existing payments
INSERT INTO public.receipts (user_id, payment_id, hp_id, buyer_id, receipt_number,
                             amount, balance_after, method, date, notes)
SELECT p.user_id, p.id, p.hp_id, h.buyer_id,
       'RCPT-' || to_char(p.created_at, 'YYYYMMDD') || '-' || p.id::text,
       p.amount, 0, p.method, p.date, p.notes
FROM public.payments p
JOIN public.hp h ON h.id = p.hp_id
ON CONFLICT (payment_id) DO NOTHING;
