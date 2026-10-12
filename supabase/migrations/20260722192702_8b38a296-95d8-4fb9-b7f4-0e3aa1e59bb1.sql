
-- 1) Lock down buyer_invites: remove broad anon SELECT policy; expose token lookup via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "anon can look up invite by token" ON public.buyer_invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _inv public.buyer_invites;
BEGIN
  SELECT * INTO _inv FROM public.buyer_invites WHERE token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'buyer_id', _inv.buyer_id,
    'user_id', _inv.user_id,
    'email', _inv.email,
    'phone', _inv.phone
  );
END $$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO anon, authenticated;

-- 2) Storage payment-proofs: replace loose policies with ownership-checked ones
DROP POLICY IF EXISTS "anon upload proof images" ON storage.objects;
DROP POLICY IF EXISTS "auth read proof images" ON storage.objects;
DROP POLICY IF EXISTS "auth delete proof images" ON storage.objects;

-- Upload: authenticated buyer uploading to their own hp folder (path convention: <hp_id>/...)
CREATE POLICY "buyer uploads own proof images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.hp h
    JOIN public.buyers b ON b.id = h.buyer_id
    WHERE b.auth_user_id = auth.uid()
      AND h.id::text = split_part(name, '/', 1)
  )
);

-- Read: manager owner of the payment_proof record, or the buyer who owns the hp
CREATE POLICY "owners read proof images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    EXISTS (
      SELECT 1 FROM public.payment_proofs pp
      WHERE pp.image_path = name AND pp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.hp h
      JOIN public.buyers b ON b.id = h.buyer_id
      WHERE b.auth_user_id = auth.uid()
        AND h.id::text = split_part(name, '/', 1)
    )
  )
);

-- Delete: only the manager who owns the underlying payment_proof record
CREATE POLICY "manager deletes own proof images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.payment_proofs pp
    WHERE pp.image_path = name AND pp.user_id = auth.uid()
  )
);

-- 3) Tighten EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.current_buyer_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_buyer_id() TO authenticated;

REVOKE ALL ON FUNCTION public.notify_buyer_on_payment() FROM PUBLIC, anon, authenticated;

-- Token-gated public RPCs: keep callable but remove PUBLIC blanket grant
REVOKE ALL ON FUNCTION public.get_hp_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hp_by_token(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text) TO anon, authenticated;
