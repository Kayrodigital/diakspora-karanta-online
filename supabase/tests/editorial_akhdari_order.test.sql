-- Run after the editorial migration, inside a transaction that will be rolled back.
-- The test mutates order/title only to prove RLS and persistence, then restores them.

DO $integrity$
DECLARE
  v_sessions integer;
  v_orders integer;
  v_min integer;
  v_max integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='source_title'
      AND data_type='text' AND is_nullable='YES'
  ) THEN RAISE EXCEPTION 'E01 source_title definition'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='learning_points'
      AND data_type='jsonb' AND is_nullable='NO'
  ) THEN RAISE EXCEPTION 'E02 learning_points definition'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sessions' AND column_name='reflection_questions'
      AND data_type='jsonb' AND is_nullable='NO'
  ) THEN RAISE EXCEPTION 'E03 reflection_questions definition'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sessions'::regclass AND conname='sessions_learning_points_array_check')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.sessions'::regclass AND conname='sessions_reflection_questions_array_check')
  THEN RAISE EXCEPTION 'E04 editorial JSON checks'; END IF;

  SELECT count(*),count(DISTINCT session.order_index),min(session.order_index),max(session.order_index)
  INTO v_sessions,v_orders,v_min,v_max
  FROM public.sessions session
  JOIN public.lessons lesson ON lesson.id=session.lesson_id
  JOIN public.chapters chapter ON chapter.id=lesson.chapter_id
  JOIN public.books book ON book.id=chapter.book_id
  WHERE book.title='Mukhtasar Al-Akhdari';
  IF v_sessions<>57 THEN RAISE EXCEPTION 'E05 Akhdari sessions %',v_sessions; END IF;
  IF v_orders<>57 OR v_min<>0 OR v_max<>56 THEN RAISE EXCEPTION 'E06 canonical order %, %, %',v_orders,v_min,v_max; END IF;

  IF (
    SELECT count(*) FROM public.sessions session
    JOIN public.lessons lesson ON lesson.id=session.lesson_id
    JOIN public.chapters chapter ON chapter.id=lesson.chapter_id
    JOIN public.books book ON book.id=chapter.book_id
    WHERE book.title='Mukhtasar Al-Akhdari' AND session.source_title ~ '^Akhdari ([1-9]|[1-4][0-9]|5[0-7])$'
  )<>57 THEN RAISE EXCEPTION 'E07 source titles'; END IF;
  IF (
    SELECT md5(string_agg(session.id::text||':'||session.lesson_id::text,',' ORDER BY session.id))
    FROM public.sessions session
    JOIN public.lessons lesson ON lesson.id=session.lesson_id
    JOIN public.chapters chapter ON chapter.id=lesson.chapter_id
    JOIN public.books book ON book.id=chapter.book_id
    WHERE book.title='Mukhtasar Al-Akhdari'
  )<>'55c80b60a076115d14e714b27ebf9dcc' THEN RAISE EXCEPTION 'E08 session/lesson UUID changed'; END IF;
  IF (
    SELECT md5(string_agg(resource.id::text||':'||coalesce(resource.external_url,''),',' ORDER BY resource.id))
    FROM public.lesson_resources resource
    JOIN public.sessions session ON session.id=resource.session_id
    JOIN public.lessons lesson ON lesson.id=session.lesson_id
    JOIN public.chapters chapter ON chapter.id=lesson.chapter_id
    JOIN public.books book ON book.id=chapter.book_id
    WHERE book.title='Mukhtasar Al-Akhdari'
  )<>'f2150cbe0e24bbebb7b24b3c72fe535f' THEN RAISE EXCEPTION 'E09 resources/video IDs changed'; END IF;
  IF (
    SELECT md5(string_agg(quiz.id::text||':'||quiz.activity_id::text,',' ORDER BY quiz.id))
    FROM public.quizzes quiz
    JOIN public.activities activity ON activity.id=quiz.activity_id
    JOIN public.sessions session ON session.id=activity.session_id
    JOIN public.lessons lesson ON lesson.id=session.lesson_id
    JOIN public.chapters chapter ON chapter.id=lesson.chapter_id
    JOIN public.books book ON book.id=chapter.book_id
    WHERE book.title='Mukhtasar Al-Akhdari'
  )<>'eec1c55843508ce477ccc7bd11521099' THEN RAISE EXCEPTION 'E10 quiz links changed'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.profile_session_progress progress
    JOIN public.sessions session ON session.id=progress.session_id
    JOIN public.lessons lesson ON lesson.id=session.lesson_id
    JOIN public.chapters chapter ON chapter.id=lesson.chapter_id
    JOIN public.books book ON book.id=chapter.book_id
    WHERE book.title='Mukhtasar Al-Akhdari'
  ) THEN RAISE EXCEPTION 'E11 unexpected progress baseline change'; END IF;
  IF (SELECT count(*) FROM public.activities activity JOIN public.sessions session ON session.id=activity.session_id JOIN public.lessons lesson ON lesson.id=session.lesson_id JOIN public.chapters chapter ON chapter.id=lesson.chapter_id JOIN public.books book ON book.id=chapter.book_id WHERE book.title='Mukhtasar Al-Akhdari')<>58
    OR (SELECT count(*) FROM public.quizzes quiz JOIN public.activities activity ON activity.id=quiz.activity_id JOIN public.sessions session ON session.id=activity.session_id JOIN public.lessons lesson ON lesson.id=session.lesson_id JOIN public.chapters chapter ON chapter.id=lesson.chapter_id JOIN public.books book ON book.id=chapter.book_id WHERE book.title='Mukhtasar Al-Akhdari')<>58
  THEN RAISE EXCEPTION 'E12 activities/quizzes count'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_update' AND qual='private.can_prepare_session(id)')
  THEN RAISE EXCEPTION 'E13 session update RLS changed'; END IF;
  IF pg_get_functiondef('private.can_manage_learning(uuid)'::regprocedure) NOT LIKE '%owner%admin%pedagogical_manager%'
  THEN RAISE EXCEPTION 'E14 editorial role helper changed'; END IF;
END
$integrity$;

-- Real drag-and-drop persistence test: 12 before 11, reread, then canonical restore.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true),
       set_config('request.jwt.claim.sub','7dffded4-9741-4692-b593-216cc1f4e609',true);
DO $admin_edit$
DECLARE
  v_title text;
  v_order_11 integer;
  v_order_12 integer;
  v_rows integer;
BEGIN
  UPDATE public.sessions SET order_index=1000 WHERE id='ced8a3ea-24c9-57c9-b851-59354c072fab';
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>1 THEN RAISE EXCEPTION 'E15 admin drag denied'; END IF;
  UPDATE public.sessions SET order_index=11 WHERE id='36290c4e-62b2-52f1-8b1e-102fd1adfd0f';
  UPDATE public.sessions SET order_index=10 WHERE id='ced8a3ea-24c9-57c9-b851-59354c072fab';
  SELECT order_index INTO v_order_11 FROM public.sessions WHERE id='36290c4e-62b2-52f1-8b1e-102fd1adfd0f';
  SELECT order_index INTO v_order_12 FROM public.sessions WHERE id='ced8a3ea-24c9-57c9-b851-59354c072fab';
  IF v_order_12<>10 OR v_order_11<>11 THEN RAISE EXCEPTION 'E16 drag did not persist'; END IF;
  UPDATE public.sessions SET order_index=10 WHERE id='36290c4e-62b2-52f1-8b1e-102fd1adfd0f';
  UPDATE public.sessions SET order_index=11 WHERE id='ced8a3ea-24c9-57c9-b851-59354c072fab';

  SELECT title INTO v_title FROM public.sessions WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b';
  UPDATE public.sessions SET title='TEST ÉDITORIAL TEMPORAIRE',summary='TEST TEMPORAIRE' WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b';
  IF (SELECT title FROM public.sessions WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b')<>'TEST ÉDITORIAL TEMPORAIRE'
  THEN RAISE EXCEPTION 'E17 title edit did not persist'; END IF;
  UPDATE public.sessions SET title=v_title,summary='Séance 08 du parcours Akhdari. Référence : PDF p. 13 (page imprimée 12).' WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b';
END
$admin_edit$;
RESET ROLE;

-- Normal learner is denied.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true),
       set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $learner_denied$
DECLARE v_rows integer;
BEGIN
  UPDATE public.sessions SET title='INTERDIT' WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b';
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>0 THEN RAISE EXCEPTION 'E18 learner edited a session'; END IF;
END
$learner_denied$;
RESET ROLE;

-- A standard teacher membership still cannot edit the published Akhdari corpus.
UPDATE public.organization_memberships
SET role='teacher'
WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND user_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true),
       set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $teacher_denied$
DECLARE v_rows integer;
BEGIN
  UPDATE public.sessions SET title='INTERDIT' WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b';
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>0 THEN RAISE EXCEPTION 'E19 standard teacher edited Akhdari'; END IF;
END
$teacher_denied$;
RESET ROLE;
UPDATE public.organization_memberships
SET role='learner'
WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND user_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';

-- Majliss assistant scope does not grant editorial access.
INSERT INTO public.majliss_teacher_assignments(organization_id,user_id,teacher_id,village_id,status,created_by)
SELECT scope.organization_id,'777cbdea-7c2c-430d-872f-26fa2d6e9088',scope.teacher_id,scope.village_id,'active','7dffded4-9741-4692-b593-216cc1f4e609'
FROM public.majliss_teacher_villages scope
WHERE scope.organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f'
LIMIT 1;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true),
       set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $assistant_denied$
DECLARE v_rows integer;
BEGIN
  UPDATE public.sessions SET title='INTERDIT' WHERE id='fdacd02f-c66e-5340-b990-47f47964ad5b';
  GET DIAGNOSTICS v_rows=ROW_COUNT;
  IF v_rows<>0 THEN RAISE EXCEPTION 'E20 Majliss assistant edited Akhdari'; END IF;
END
$assistant_denied$;
RESET ROLE;

SELECT 'EDITORIAL_AKHDARI_TESTS_PASS' AS result;
