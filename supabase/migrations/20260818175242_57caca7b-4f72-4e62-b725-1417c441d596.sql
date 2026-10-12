CREATE OR REPLACE FUNCTION public.log_payment_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _buyer_id bigint;
BEGIN
  SELECT buyer_id INTO _buyer_id FROM public.hp WHERE id = NEW.hp_id;
  INSERT INTO public.activity_logs(user_id, owner_id, buyer_id, action, description)
  VALUES (NEW.user_id, NEW.user_id, _buyer_id, 'payment_recorded',
          'Payment of UGX ' || to_char(NEW.amount, 'FM999,999,999') || ' recorded on ' || NEW.date::text);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_payment_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_payment_activity() TO service_role;

DROP TRIGGER IF EXISTS trg_log_payment_activity ON public.payments;
CREATE TRIGGER trg_log_payment_activity AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_activity();

CREATE OR REPLACE FUNCTION public.log_receipt_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs(user_id, owner_id, buyer_id, action, description)
  VALUES (NEW.user_id, NEW.user_id, NEW.buyer_id, 'receipt_generated',
          'Receipt ' || NEW.receipt_number || ' issued for UGX ' || to_char(NEW.amount, 'FM999,999,999'));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_receipt_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_receipt_activity() TO service_role;

DROP TRIGGER IF EXISTS trg_log_receipt_activity ON public.receipts;
CREATE TRIGGER trg_log_receipt_activity AFTER INSERT ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.log_receipt_activity();