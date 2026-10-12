
-- 1. share_token on hp
ALTER TABLE public.hp ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS hp_share_token_idx ON public.hp(share_token);

-- 2. payment_proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id bigserial PRIMARY KEY,
  hp_id bigint NOT NULL REFERENCES public.hp(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  image_path text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_proofs TO authenticated;
GRANT SELECT, INSERT ON public.payment_proofs TO anon;
GRANT ALL ON public.payment_proofs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.payment_proofs_id_seq TO authenticated, anon, service_role;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager manages own proofs" ON public.payment_proofs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Anonymous buyers can insert a proof if they include a valid share token that matches the hp
CREATE POLICY "anon insert proof with valid token" ON public.payment_proofs
  FOR INSERT TO anon WITH CHECK (
    EXISTS (SELECT 1 FROM public.hp h WHERE h.id = hp_id AND h.user_id = payment_proofs.user_id)
  );

-- 3. Public token-scoped read function (SECURITY DEFINER) for buyer portal
CREATE OR REPLACE FUNCTION public.get_hp_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hp public.hp;
  _car public.cars;
  _buyer public.buyers;
  _payments jsonb;
BEGIN
  SELECT * INTO _hp FROM public.hp WHERE share_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO _car FROM public.cars WHERE id = _hp.car_id;
  SELECT * INTO _buyer FROM public.buyers WHERE id = _hp.buyer_id;
  SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.date DESC), '[]'::jsonb)
    INTO _payments FROM public.payments p WHERE p.hp_id = _hp.id;
  RETURN jsonb_build_object(
    'hp', row_to_json(_hp),
    'car', row_to_json(_car),
    'buyer', jsonb_build_object('fullName', _buyer.full_name, 'phone', _buyer.phone),
    'payments', _payments
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_hp_by_token(uuid) TO anon, authenticated;

-- Function to submit a payment proof by token (returns proof id)
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  _token uuid, _amount numeric, _date date, _method text,
  _reference text, _notes text, _image_path text
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _hp public.hp; _id bigint;
BEGIN
  SELECT * INTO _hp FROM public.hp WHERE share_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid token'; END IF;
  INSERT INTO public.payment_proofs(hp_id, user_id, amount, date, method, reference, notes, image_path)
    VALUES (_hp.id, _hp.user_id, _amount, _date, _method, _reference, _notes, _image_path)
    RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text) TO anon, authenticated;
