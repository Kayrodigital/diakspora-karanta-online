-- PROPOSED migration. Review on an isolated canonical M5+ schema first.
-- No production application, backfill, entitlement grant, schema reset or flag activation.
BEGIN;
CREATE OR REPLACE FUNCTION public.create_my_child_profile(
  p_organization_id uuid, p_name text, p_guardian_consent boolean, p_request_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  parent_id uuid;
  child_name text := btrim(p_name);
BEGIN
  IF actor IS NULL OR p_guardian_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Parent authentication and guardian consent required' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR child_name IS NULL OR char_length(child_name) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'Invalid child profile' USING ERRCODE = '22023';
  END IF;
  SELECT p.id INTO STRICT parent_id
  FROM public.profiles p
  JOIN public.organization_memberships m ON m.user_id = p.auth_user_id
    AND m.organization_id = p.organization_id AND m.role = 'parent' AND m.status = 'active'
  JOIN public.organizations o ON o.id = p.organization_id AND o.status = 'active'
  WHERE p.auth_user_id = actor AND p.organization_id = p_organization_id AND p.status = 'active'
    AND o.feature_flags @> '{"profile_identity_v2":true,"family_onboarding_v1":true}'::jsonb;

  -- Serializes retries and concurrent submissions for this parent.
  PERFORM pg_advisory_xact_lock(hashtextextended(parent_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_request_id) THEN
    IF EXISTS (SELECT 1 FROM public.family_relationships f
      JOIN public.profiles p ON p.id = f.child_profile_id
      WHERE f.parent_profile_id = parent_id AND f.child_profile_id = p_request_id
        AND f.organization_id = p_organization_id AND f.status = 'active'
        AND p.full_name = child_name AND p.status = 'active') THEN
      RETURN p_request_id;
    END IF;
    RAISE EXCEPTION 'Profile identifier unavailable' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.profiles
    (id, organization_id, auth_user_id, full_name, profile_type, status, role, created_by)
    VALUES (p_request_id, p_organization_id, NULL, child_name, 'child', 'active', 'learner', actor);
  INSERT INTO public.family_relationships
    (organization_id, parent_profile_id, child_profile_id, parent_user_id, learner_user_id, relationship, status, created_by)
    VALUES (p_organization_id, parent_id, p_request_id, actor, NULL, 'parent', 'active', actor);
  INSERT INTO public.learner_profiles
    (organization_id, profile_id, user_id, guardian_user_id, full_name, access_mode, status, created_by)
    VALUES (p_organization_id, p_request_id, NULL, actor, child_name, 'guardian_managed', 'active', actor);
  RETURN p_request_id;
EXCEPTION WHEN no_data_found OR too_many_rows THEN
  RAISE EXCEPTION 'Active parent access required' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.create_my_child_profile(uuid,text,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_child_profile(uuid,text,boolean,uuid) TO authenticated;
COMMIT;
