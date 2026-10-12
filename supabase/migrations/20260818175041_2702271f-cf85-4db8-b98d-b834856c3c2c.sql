-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('manager','buyer')),
  buyer_id bigint REFERENCES public.buyers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 2. REMINDERS
CREATE TABLE IF NOT EXISTS public.reminders (
  id bigserial PRIMARY KEY,
  buyer_id bigint NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  hp_id bigint,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager manages own reminders" ON public.reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buyer reads own reminders" ON public.reminders FOR SELECT TO authenticated
  USING (buyer_id = public.current_buyer_id());

-- 3. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id bigserial PRIMARY KEY,
  user_id uuid,
  owner_id uuid,
  buyer_id bigint,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager reads own logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "manager writes logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "buyer reads own logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (buyer_id IS NOT NULL AND buyer_id = public.current_buyer_id());

-- 4. buyers: timestamp for change tracking
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO service_role;

DROP TRIGGER IF EXISTS touch_buyers_updated_at ON public.buyers;
CREATE TRIGGER touch_buyers_updated_at BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS touch_profiles_updated_at ON public.profiles;
CREATE TRIGGER touch_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS touch_reminders_updated_at ON public.reminders;
CREATE TRIGGER touch_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Allow trusted server-side code (service role) to link buyer auth accounts
CREATE OR REPLACE FUNCTION public.protect_buyer_auth_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user = 'service_role'
     OR (auth.jwt() ->> 'role') = 'service_role'
     OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
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
REVOKE ALL ON FUNCTION public.protect_buyer_auth_link() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_buyer_auth_link() TO service_role;

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_notifications;