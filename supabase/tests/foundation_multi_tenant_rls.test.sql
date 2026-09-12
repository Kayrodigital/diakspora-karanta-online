BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(8);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'learner-a@example.test',
    '',
    '{}'::jsonb,
    '{"full_name":"Learner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    '',
    '{}'::jsonb,
    '{"full_name":"Owner B"}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.organizations (id, name, slug)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'School A', 'school-a'),
  ('b0000000-0000-0000-0000-000000000002', 'School B', 'school-b');

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  is_default
)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'learner',
    'active',
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'owner',
    'active',
    true
  );

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

SELECT results_eq(
  'SELECT count(*)::bigint FROM public.organization_memberships',
  ARRAY[1::bigint],
  'A learner can read only their own membership'
);

SELECT results_eq(
  'SELECT count(*)::bigint FROM public.organizations',
  ARRAY[1::bigint],
  'A learner can read only their organization'
);

SELECT ok(
  private.is_organization_member('a0000000-0000-0000-0000-000000000001'),
  'Membership helper accepts the current organization'
);

SELECT is(
  private.is_organization_member('b0000000-0000-0000-0000-000000000002'),
  false,
  'Membership helper rejects another organization'
);

SELECT ok(
  private.has_organization_role(
    'a0000000-0000-0000-0000-000000000001',
    ARRAY['learner']
  ),
  'Role helper accepts the assigned role'
);

SELECT is(
  private.has_organization_role(
    'a0000000-0000-0000-0000-000000000001',
    ARRAY['admin']
  ),
  false,
  'Role helper rejects an unassigned role'
);

SELECT is(
  has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  false,
  'Authenticated users cannot update the legacy role column'
);

SELECT results_eq(
  'SELECT count(*)::bigint FROM public.profiles',
  ARRAY[1::bigint],
  'A learner can read only their profile'
);

SELECT * FROM finish();
ROLLBACK;
