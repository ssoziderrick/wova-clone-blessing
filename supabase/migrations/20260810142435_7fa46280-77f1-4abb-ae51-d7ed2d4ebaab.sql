REVOKE ALL ON FUNCTION public.generate_receipt_on_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_buyer_auth_link() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_invite_by_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_receipt_on_payment() TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_buyer_auth_link() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(uuid) TO service_role;