
-- CARS
CREATE TABLE public.cars (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  plate TEXT NOT NULL,
  vin TEXT,
  engine_number TEXT,
  buying_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  date_purchased DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'in_stock',
  photos JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cars_id_seq TO authenticated;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cars" ON public.cars FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUYERS
CREATE TABLE public.buyers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  nin TEXT,
  address TEXT,
  occupation TEXT,
  emergency_contact TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT ALL ON public.buyers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.buyers_id_seq TO authenticated;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own buyers" ON public.buyers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HP AGREEMENTS
CREATE TABLE public.hp (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id BIGINT NOT NULL,
  buyer_id BIGINT NOT NULL,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC NOT NULL DEFAULT 0,
  interest NUMERIC NOT NULL DEFAULT 0,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  number_of_installments INT NOT NULL DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp TO authenticated;
GRANT ALL ON public.hp TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.hp_id_seq TO authenticated;
ALTER TABLE public.hp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hp" ON public.hp FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PAYMENTS
CREATE TABLE public.payments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hp_id BIGINT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.payments_id_seq TO authenticated;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SETTINGS
CREATE TABLE public.settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.cars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buyers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
