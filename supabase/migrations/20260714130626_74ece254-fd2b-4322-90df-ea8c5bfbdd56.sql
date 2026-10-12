
-- Anyone can upload into the payment-proofs bucket (files are pending until manager approves)
CREATE POLICY "anon upload proof images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Signed-in managers can read/delete files in the bucket (scoped in app to their own proofs)
CREATE POLICY "auth read proof images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs');
CREATE POLICY "auth delete proof images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'payment-proofs');
