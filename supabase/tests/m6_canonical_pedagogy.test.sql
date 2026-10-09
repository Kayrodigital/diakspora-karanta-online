-- Run after 20261009063045_m6_canonical_pedagogy.sql inside one transaction.

DO $$
DECLARE
  org_id constant uuid := '390a6abd-8712-490c-8f8d-846165bf9f9f';
BEGIN
  IF (SELECT count(*) FROM public.subjects) <> 3 THEN
    RAISE EXCEPTION 'M6-I01 subjects were not preserved';
  END IF;
  IF (SELECT count(*) FROM public.books) <> 3 THEN
    RAISE EXCEPTION 'M6-I02 course-to-book backfill incomplete';
  END IF;
  IF (SELECT count(*) FROM public.courses) <> 3 THEN
    RAISE EXCEPTION 'M6-I03 courses changed';
  END IF;
  IF (SELECT count(*) FROM public.course_modules) <> 3 THEN
    RAISE EXCEPTION 'M6-I04 modules changed';
  END IF;
  IF (SELECT count(*) FROM public.lessons) <> 10 THEN
    RAISE EXCEPTION 'M6-I05 lessons changed';
  END IF;
  IF (SELECT count(*) FROM public.lesson_resources) <> 14 THEN
    RAISE EXCEPTION 'M6-I06 lesson resources changed';
  END IF;
  IF (SELECT count(*) FROM public.chapters) <> 3 THEN
    RAISE EXCEPTION 'M6-I07 module-to-chapter backfill incomplete';
  END IF;
  IF (SELECT count(*) FROM public.sessions) <> 10 THEN
    RAISE EXCEPTION 'M6-I08 lesson-to-session backfill incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.courses course
    LEFT JOIN public.books book ON book.id = course.book_id
    WHERE book.id IS NULL
      OR book.organization_id IS DISTINCT FROM course.organization_id
      OR (book.legacy_course_id = course.id AND book.id IS DISTINCT FROM course.id)
  ) THEN
    RAISE EXCEPTION 'M6-I09 invalid course-to-book mapping';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.course_modules module
    LEFT JOIN public.chapters chapter ON chapter.legacy_course_module_id = module.id
    JOIN public.courses course ON course.id = module.course_id
    WHERE chapter.id IS NULL
      OR chapter.id IS DISTINCT FROM module.id
      OR chapter.book_id IS DISTINCT FROM course.book_id
      OR chapter.organization_id IS DISTINCT FROM module.organization_id
  ) THEN
    RAISE EXCEPTION 'M6-I10 invalid module-to-chapter mapping';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lessons lesson
    JOIN public.course_modules module ON module.id = lesson.module_id
    WHERE lesson.chapter_id IS DISTINCT FROM module.id
  ) THEN
    RAISE EXCEPTION 'M6-I11 invalid lesson-to-chapter mapping';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lessons lesson
    WHERE lesson.chapter_id IS NULL
      AND (
        EXISTS (SELECT 1 FROM public.lesson_resources r WHERE r.lesson_id = lesson.id)
        OR EXISTS (SELECT 1 FROM public.quizzes q WHERE q.lesson_id = lesson.id)
        OR EXISTS (SELECT 1 FROM public.progress p WHERE p.lesson_id = lesson.id)
        OR EXISTS (SELECT 1 FROM public.homework_submissions h WHERE h.lesson_id = lesson.id)
        OR EXISTS (SELECT 1 FROM public.live_sessions l WHERE l.lesson_id = lesson.id)
        OR EXISTS (SELECT 1 FROM public.lesson_notes n WHERE n.lesson_id = lesson.id)
      )
  ) THEN
    RAISE EXCEPTION 'M6-I12 used lesson without chapter';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lessons lesson
    LEFT JOIN public.sessions session ON session.legacy_lesson_id = lesson.id
    WHERE session.id IS NULL
      OR session.id IS DISTINCT FROM lesson.id
      OR session.lesson_id IS DISTINCT FROM lesson.id
      OR session.organization_id IS DISTINCT FROM lesson.organization_id
      OR session.version <> 1
  ) THEN
    RAISE EXCEPTION 'M6-I13 invalid lesson-to-session mapping';
  END IF;
  IF EXISTS (
    SELECT legacy_course_id FROM public.books
    WHERE legacy_course_id IS NOT NULL GROUP BY legacy_course_id HAVING count(*) > 1
  ) OR EXISTS (
    SELECT legacy_course_module_id FROM public.chapters
    WHERE legacy_course_module_id IS NOT NULL GROUP BY legacy_course_module_id HAVING count(*) > 1
  ) OR EXISTS (
    SELECT legacy_lesson_id FROM public.sessions
    WHERE legacy_lesson_id IS NOT NULL GROUP BY legacy_lesson_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'M6-I14 duplicate canonical bridge';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.chapters chapter
    JOIN public.books book ON book.id = chapter.book_id
    WHERE chapter.organization_id IS DISTINCT FROM book.organization_id
  ) OR EXISTS (
    SELECT 1 FROM public.sessions session
    JOIN public.lessons lesson ON lesson.id = session.lesson_id
    WHERE session.organization_id IS DISTINCT FROM lesson.organization_id
  ) THEN
    RAISE EXCEPTION 'M6-I15 cross-organization canonical relation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.chapters WHERE order_index < 0
  ) OR EXISTS (
    SELECT 1 FROM public.sessions WHERE order_index < 0
  ) THEN
    RAISE EXCEPTION 'M6-I16 invalid pedagogical order';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sessions WHERE access_tier IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'M6-I17 legacy access tier was invented';
  END IF;
  IF (SELECT count(*) FROM auth.users) <> 2
     OR (SELECT count(*) FROM public.organization_memberships) <> 2
     OR (SELECT count(*) FROM public.profiles) <> 2 THEN
    RAISE EXCEPTION 'M6-I18 M1-M5 identity changed';
  END IF;
  IF (SELECT count(*) FROM public.quiz_attempts) <> 1
     OR EXISTS (SELECT 1 FROM public.quiz_attempts WHERE profile_id IS NULL) THEN
    RAISE EXCEPTION 'M6-I19 M5 quiz identity changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id AND feature_flags->>'pedagogy_v1' = 'false'
  ) THEN
    RAISE EXCEPTION 'M6-I20 feature flag must start disabled';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lessons'
      AND column_name='course_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lessons'
      AND column_name='module_id'
  ) THEN
    RAISE EXCEPTION 'M6-I21 legacy lesson bridges removed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('courses','course_modules','lesson_resources')
    GROUP BY n.nspname HAVING count(*)=3
  ) THEN
    RAISE EXCEPTION 'M6-I22 legacy tables removed';
  END IF;
  IF has_column_privilege('anon','public.lessons','content','SELECT')
     OR has_column_privilege('anon','public.lessons','video_url','SELECT') THEN
    RAISE EXCEPTION 'M6-I23 public lesson grant exposes resource content';
  END IF;
  IF NOT has_column_privilege('anon','public.lessons','title','SELECT')
     OR NOT has_table_privilege('anon','public.sessions','SELECT') THEN
    RAISE EXCEPTION 'M6-I24 public metadata grants missing';
  END IF;
  IF private.has_organization_role(org_id, ARRAY['technician']) THEN
    NULL; -- evaluated only with an authenticated JWT in the RLS section.
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='can_prepare_session'
      AND p.prosecdef AND p.proconfig @> ARRAY['search_path=""']
  ) THEN
    RAISE EXCEPTION 'M6-I25 private helper hardening';
  END IF;
  IF has_function_privilege('public','private.can_prepare_session(uuid)','EXECUTE')
     OR has_function_privilege('anon','private.can_prepare_session(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','private.can_prepare_session(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'M6-I26 private helper grants';
  END IF;
END
$$;

-- Controlled RLS fixtures. The outer dry-run transaction removes them.
INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-0000000006b0', 'M6 isolation fixture', 'm6-isolation');

INSERT INTO public.subjects (
  id, organization_id, name, slug, description, status, order_index
) VALUES
  ('00000000-0000-4000-8000-0000000006a1', '390a6abd-8712-490c-8f8d-846165bf9f9f',
   'M6 draft subject', 'm6-draft-subject', 'Controlled fixture', 'draft', 90),
  ('00000000-0000-4000-8000-0000000006b1', '00000000-0000-4000-8000-0000000006b0',
   'M6 other organization', 'm6-other-organization', 'Controlled fixture', 'draft', 0);

INSERT INTO public.books (
  id, organization_id, subject_id, title, status, created_by
) VALUES
  ('00000000-0000-4000-8000-0000000006a2', '390a6abd-8712-490c-8f8d-846165bf9f9f',
   '00000000-0000-4000-8000-0000000006a1', 'M6 teacher own draft', 'draft',
   '777cbdea-7c2c-430d-872f-26fa2d6e9088'),
  ('00000000-0000-4000-8000-0000000006a3', '390a6abd-8712-490c-8f8d-846165bf9f9f',
   '00000000-0000-4000-8000-0000000006a1', 'M6 other teacher draft', 'draft',
   '7dffded4-9741-4692-b593-216cc1f4e609'),
  ('00000000-0000-4000-8000-0000000006b2', '00000000-0000-4000-8000-0000000006b0',
   '00000000-0000-4000-8000-0000000006b1', 'M6 cross organization draft', 'draft',
   '7dffded4-9741-4692-b593-216cc1f4e609');

-- RLS-01/02 visitor published allowed, draft refused.
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.subjects WHERE status='published') <> 3 THEN
    RAISE EXCEPTION 'M6-RLS-01 visitor cannot read the published catalogue';
  END IF;
  IF EXISTS (SELECT 1 FROM public.books WHERE id IN (
    '00000000-0000-4000-8000-0000000006a2',
    '00000000-0000-4000-8000-0000000006a3',
    '00000000-0000-4000-8000-0000000006b2'
  )) THEN
    RAISE EXCEPTION 'M6-RLS-02 visitor can read a draft';
  END IF;
END
$$;
RESET ROLE;

-- Temporarily make the existing learner a teacher for policy verification.
UPDATE public.organization_memberships
SET role='teacher'
WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND user_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $$
DECLARE changed integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.books WHERE id='00000000-0000-4000-8000-0000000006a2') THEN
    RAISE EXCEPTION 'M6-RLS-03 teacher cannot read own draft';
  END IF;
  IF EXISTS (SELECT 1 FROM public.books WHERE id='00000000-0000-4000-8000-0000000006a3') THEN
    RAISE EXCEPTION 'M6-RLS-04 teacher can read another teacher draft';
  END IF;
  IF EXISTS (SELECT 1 FROM public.books WHERE id='00000000-0000-4000-8000-0000000006b2') THEN
    RAISE EXCEPTION 'M6-RLS-05 cross-organization draft exposed';
  END IF;
  BEGIN
    UPDATE public.books
    SET status='published'
    WHERE id='00000000-0000-4000-8000-0000000006a2';
    GET DIAGNOSTICS changed = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN
    changed := 0;
  END;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'M6-RLS-06 teacher published content';
  END IF;
END
$$;
RESET ROLE;

-- RLS-07 learner keeps access to published catalogue metadata.
UPDATE public.organization_memberships
SET role='learner'
WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND user_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.books WHERE status='published') <> 2
     OR (SELECT count(*) FROM public.sessions WHERE status='published') <> 6 THEN
    RAISE EXCEPTION 'M6-RLS-07 learner lost published catalogue access';
  END IF;
END
$$;
RESET ROLE;

-- Technical admin has no implicit editorial permission.
UPDATE public.organization_memberships
SET role='technician'
WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND user_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $$
BEGIN
  IF private.can_manage_learning('390a6abd-8712-490c-8f8d-846165bf9f9f') THEN
    RAISE EXCEPTION 'M6-RLS-08 technician received pedagogical editorial rights';
  END IF;
END
$$;
RESET ROLE;

-- Sensitivity: make the other draft owned by the teacher. The negative test
-- must now flip to visible, proving that RLS assertions can turn red.
UPDATE public.organization_memberships
SET role='teacher'
WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND user_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';
UPDATE public.books
SET created_by='777cbdea-7c2c-430d-872f-26fa2d6e9088'
WHERE id='00000000-0000-4000-8000-0000000006a3';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $$
DECLARE
  deliberately_wrong_assertion_failed boolean := false;
BEGIN
  BEGIN
    -- Deliberately reuse the now-invalid negative assertion. It must raise,
    -- otherwise the RLS suite is incapable of detecting this regression.
    IF EXISTS (SELECT 1 FROM public.books WHERE id='00000000-0000-4000-8000-0000000006a3') THEN
      RAISE EXCEPTION 'M6-SENSITIVITY-EXPECTED-FAILURE';
    END IF;
  EXCEPTION
    WHEN raise_exception THEN
      deliberately_wrong_assertion_failed := true;
  END;

  IF NOT deliberately_wrong_assertion_failed THEN
    RAISE EXCEPTION 'M6-SENSITIVITY: deliberately wrong assertion stayed green';
  END IF;
END
$$;
RESET ROLE;
