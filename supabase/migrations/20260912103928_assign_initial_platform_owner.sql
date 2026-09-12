DO $$
DECLARE
  target_user_id uuid;
  diakspora_organization_id uuid;
BEGIN
  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower('kayro.digital@gmail.com')
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Karanta owner account was not found in auth.users';
  END IF;

  SELECT id
  INTO diakspora_organization_id
  FROM public.organizations
  WHERE slug = 'diakspora'
  LIMIT 1;

  IF diakspora_organization_id IS NULL THEN
    RAISE EXCEPTION 'Diakspora organization was not found';
  END IF;

  UPDATE public.organization_memberships
  SET is_default = false,
      updated_at = now()
  WHERE user_id = target_user_id
    AND is_default = true;

  INSERT INTO public.organization_memberships (
    organization_id,
    user_id,
    role,
    status,
    is_default
  )
  VALUES (
    diakspora_organization_id,
    target_user_id,
    'owner',
    'active',
    true
  )
  ON CONFLICT (organization_id, user_id, role) DO UPDATE
  SET status = 'active',
      is_default = true,
      updated_at = now();

  INSERT INTO public.platform_administrators (user_id, role)
  VALUES (target_user_id, 'platform_owner')
  ON CONFLICT (user_id) DO UPDATE
  SET role = 'platform_owner';

  UPDATE public.organizations
  SET created_by = COALESCE(created_by, target_user_id),
      updated_at = now()
  WHERE id = diakspora_organization_id;

  INSERT INTO public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    diakspora_organization_id,
    target_user_id,
    'platform_owner_assigned',
    'user',
    target_user_id::text,
    jsonb_build_object('source', 'initial_setup')
  );
END;
$$;
