-- Administration foundation: organization directory, invitations, managed
-- learner profiles and class enrollments. All records remain tenant scoped.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles AS profile
SET email = lower(account.email)
FROM auth.users AS account
WHERE account.id = profile.id
  AND profile.email IS DISTINCT FROM lower(account.email);

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    lower(NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.learner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 160),
  preferred_name text,
  email text,
  phone text,
  birth_date date,
  access_mode text NOT NULL DEFAULT 'individual'
    CHECK (access_mode IN ('individual', 'guardian_managed')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'completed', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (access_mode = 'individual' AND user_id IS NOT NULL)
    OR (access_mode = 'guardian_managed' AND guardian_user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX learner_profiles_organization_user_idx
  ON public.learner_profiles (organization_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX learner_profiles_organization_status_idx
  ON public.learner_profiles (organization_id, status);
CREATE INDEX learner_profiles_guardian_idx
  ON public.learner_profiles (guardian_user_id)
  WHERE guardian_user_id IS NOT NULL;

INSERT INTO public.learner_profiles (
  organization_id,
  user_id,
  guardian_user_id,
  full_name,
  email,
  access_mode,
  status,
  created_by
)
SELECT
  membership.organization_id,
  membership.user_id,
  relationship.parent_user_id,
  COALESCE(profile.full_name, split_part(account.email, '@', 1), 'Élève'),
  lower(account.email),
  'individual',
  CASE membership.status
    WHEN 'suspended' THEN 'suspended'
    WHEN 'invited' THEN 'invited'
    ELSE 'active'
  END,
  membership.invited_by
FROM public.organization_memberships AS membership
LEFT JOIN public.profiles AS profile ON profile.id = membership.user_id
LEFT JOIN auth.users AS account ON account.id = membership.user_id
LEFT JOIN LATERAL (
  SELECT family.parent_user_id
  FROM public.family_relationships AS family
  WHERE family.organization_id = membership.organization_id
    AND family.learner_user_id = membership.user_id
    AND family.status = 'active'
  ORDER BY family.created_at
  LIMIT 1
) AS relationship ON true
WHERE membership.role = 'learner'
ON CONFLICT (organization_id, user_id) WHERE user_id IS NOT NULL DO NOTHING;

CREATE TABLE public.learner_cohort_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'completed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, learner_id)
);

CREATE INDEX learner_cohort_memberships_organization_idx
  ON public.learner_cohort_memberships (organization_id);
CREATE INDEX learner_cohort_memberships_learner_idx
  ON public.learner_cohort_memberships (learner_id);

INSERT INTO public.learner_cohort_memberships (
  organization_id,
  cohort_id,
  learner_id,
  status,
  joined_at,
  created_by
)
SELECT
  membership.organization_id,
  membership.cohort_id,
  learner.id,
  CASE membership.status
    WHEN 'suspended' THEN 'suspended'
    WHEN 'completed' THEN 'completed'
    ELSE 'active'
  END,
  membership.joined_at,
  membership.created_by
FROM public.cohort_memberships AS membership
JOIN public.learner_profiles AS learner
  ON learner.organization_id = membership.organization_id
 AND learner.user_id = membership.user_id
WHERE membership.role = 'learner'
ON CONFLICT (cohort_id, learner_id) DO NOTHING;

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 160),
  role text NOT NULL CHECK (
    role IN ('admin', 'technician', 'pedagogical_manager', 'teacher', 'class_manager', 'parent', 'learner')
  ),
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organization_invitations_pending_email_idx
  ON public.organization_invitations (organization_id, lower(email))
  WHERE status = 'invited';
CREATE INDEX organization_invitations_organization_status_idx
  ON public.organization_invitations (organization_id, status, created_at DESC);

ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_cohort_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.learner_profiles FROM anon, authenticated;
REVOKE ALL ON public.learner_cohort_memberships FROM anon, authenticated;
REVOKE ALL ON public.organization_invitations FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.learner_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learner_cohort_memberships TO authenticated;
GRANT SELECT ON public.organization_invitations TO authenticated;

CREATE POLICY learner_profiles_read
  ON public.learner_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR guardian_user_id = (SELECT auth.uid())
    OR private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher', 'class_manager']
    )
    OR private.is_platform_administrator()
  );

CREATE POLICY learner_profiles_insert
  ON public.learner_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  );

CREATE POLICY learner_profiles_update
  ON public.learner_profiles
  FOR UPDATE
  TO authenticated
  USING (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  )
  WITH CHECK (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  );

CREATE POLICY learner_cohort_memberships_read
  ON public.learner_cohort_memberships
  FOR SELECT
  TO authenticated
  USING (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher', 'class_manager']
    )
    OR EXISTS (
      SELECT 1
      FROM public.learner_profiles AS learner
      WHERE learner.id = learner_id
        AND (
          learner.user_id = (SELECT auth.uid())
          OR learner.guardian_user_id = (SELECT auth.uid())
        )
    )
    OR private.is_platform_administrator()
  );

CREATE POLICY learner_cohort_memberships_insert
  ON public.learner_cohort_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  );

CREATE POLICY learner_cohort_memberships_update
  ON public.learner_cohort_memberships
  FOR UPDATE
  TO authenticated
  USING (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  )
  WITH CHECK (
    private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  );

CREATE POLICY organization_invitations_read
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.has_organization_role(
      organization_id,
      ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
    )
    OR private.is_platform_administrator()
  );

DROP POLICY IF EXISTS profiles_read_organization_staff ON public.profiles;
CREATE POLICY profiles_read_organization_staff
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships AS target_membership
      WHERE target_membership.user_id = profiles.id
        AND target_membership.status IN ('active', 'invited', 'suspended')
        AND (
          private.has_organization_role(
            target_membership.organization_id,
            ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher', 'class_manager']
          )
          OR private.is_platform_administrator()
        )
    )
  );

GRANT SELECT ON public.audit_logs TO authenticated;
DROP POLICY IF EXISTS audit_logs_read_for_administrators ON public.audit_logs;
CREATE POLICY audit_logs_read_for_administrators
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND (
      private.has_organization_role(
        organization_id,
        ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
      )
      OR private.is_platform_administrator()
    )
  );

CREATE OR REPLACE FUNCTION public.accept_my_organization_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  accepted_count integer;
  current_email text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  current_email := lower(COALESCE((SELECT auth.jwt() ->> 'email'), ''));
  IF current_email = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.organization_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    updated_at = now(),
    user_id = (SELECT auth.uid())
  WHERE lower(email) = current_email
    AND user_id = (SELECT auth.uid())
    AND status = 'invited'
    AND expires_at > now();

  GET DIAGNOSTICS accepted_count = ROW_COUNT;
  RETURN accepted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_my_organization_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_my_organization_invitations() TO authenticated;
