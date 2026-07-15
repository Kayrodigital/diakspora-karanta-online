
CREATE POLICY "homework_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homework' AND owner = auth.uid());
CREATE POLICY "homework_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework' AND owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "homework_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'homework' AND owner = auth.uid());
CREATE POLICY "homework_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homework' AND owner = auth.uid());
