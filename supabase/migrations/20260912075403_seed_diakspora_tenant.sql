WITH tenant AS (
  INSERT INTO public.organizations (
    name,
    slug,
    status,
    default_locale,
    enabled_locales,
    feature_flags
  )
  VALUES (
    'Diakspora',
    'diakspora',
    'active',
    'fr',
    ARRAY['fr'],
    '{"courses": true, "live_classes": true, "replays": true, "book_store": true}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    status = 'active',
    feature_flags = EXCLUDED.feature_flags,
    updated_at = now()
  RETURNING id
)
UPDATE public.lessons
SET organization_id = (SELECT id FROM tenant)
WHERE organization_id IS NULL;
