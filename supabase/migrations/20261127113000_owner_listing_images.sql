INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', TRUE)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET file_size_limit = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
WHERE id = 'property-images';

DROP POLICY IF EXISTS "Property owners upload their listing images" ON storage.objects;
CREATE POLICY "Property owners upload their listing images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid() AND roles.role::TEXT = 'property_owner'
    )
  );

DROP POLICY IF EXISTS "Property owners update their listing images" ON storage.objects;
CREATE POLICY "Property owners update their listing images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid() AND roles.role::TEXT = 'property_owner'
    )
  )
  WITH CHECK (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid() AND roles.role::TEXT = 'property_owner'
    )
  );

DROP POLICY IF EXISTS "Property owners delete their listing images" ON storage.objects;
CREATE POLICY "Property owners delete their listing images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid() AND roles.role::TEXT = 'property_owner'
    )
  );

GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
