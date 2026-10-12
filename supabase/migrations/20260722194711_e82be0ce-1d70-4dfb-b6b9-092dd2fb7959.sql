
-- 1) Drop overly-permissive anon insert on payment_proofs (inserts go through submit_payment_proof RPC)
DROP POLICY IF EXISTS "anon insert proof with valid token" ON public.payment_proofs;

-- 2) Lock down SECURITY DEFINER function execute privileges: revoke from PUBLIC, grant only where needed
REVOKE EXECUTE ON FUNCTION public.current_buyer_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hp_by_token(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_invite_by_token(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_buyer_on_payment() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_buyer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hp_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, numeric, date, text, text, text, text) TO anon, authenticated;

-- 3) Protect buyers.auth_user_id from being modified by end users (only service_role can set/change it)
CREATE OR REPLACE FUNCTION public.protect_buyer_auth_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.auth_user_id IS NOT NULL AND NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'auth_user_id can only be set by trusted server-side logic';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'auth_user_id cannot be modified by end users';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_buyer_auth_link_trg ON public.buyers;
CREATE TRIGGER protect_buyer_auth_link_trg
BEFORE INSERT OR UPDATE ON public.buyers
FOR EACH ROW EXECUTE FUNCTION public.protect_buyer_auth_link();
