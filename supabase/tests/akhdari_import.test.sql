-- Execute after the Akhdari migration in the same transaction, then ROLLBACK.

DO $integrity$
DECLARE checks integer := 0;
BEGIN
  IF (SELECT count(*) FROM public.chapters WHERE book_id='cbfcd804-4499-4def-9496-7485e3fae821') <> 6 THEN RAISE EXCEPTION 'AK-I01 chapters'; END IF; checks:=checks+1;
  IF (SELECT count(*) FROM public.lessons WHERE chapter_id IN (SELECT id FROM public.chapters WHERE book_id='cbfcd804-4499-4def-9496-7485e3fae821')) <> 57 THEN RAISE EXCEPTION 'AK-I02 lessons'; END IF; checks:=checks+1;
  IF (SELECT count(*) FROM public.sessions WHERE lesson_id IN (SELECT id FROM public.lessons WHERE chapter_id IN (SELECT id FROM public.chapters WHERE book_id='cbfcd804-4499-4def-9496-7485e3fae821'))) <> 57 THEN RAISE EXCEPTION 'AK-I03 sessions'; END IF; checks:=checks+1;
  IF (SELECT count(*) FROM public.lesson_resources WHERE source_name='Akhdari — corpus officiel 57 vidéos') <> 57 THEN RAISE EXCEPTION 'AK-I04 resources'; END IF; checks:=checks+1;
  IF EXISTS (SELECT external_url FROM public.lesson_resources WHERE source_name='Akhdari — corpus officiel 57 vidéos' GROUP BY external_url HAVING count(*)<>1) THEN RAISE EXCEPTION 'AK-I05 duplicate video'; END IF; checks:=checks+1;
  IF EXISTS (SELECT 1 FROM public.sessions s JOIN public.lessons l ON l.id=s.lesson_id JOIN public.chapters c ON c.id=l.chapter_id WHERE c.book_id='cbfcd804-4499-4def-9496-7485e3fae821' AND (s.status<>'published' OR s.access_tier<>'free')) THEN RAISE EXCEPTION 'AK-I06 session access'; END IF; checks:=checks+1;
  IF EXISTS (SELECT 1 FROM public.lesson_resources WHERE source_name='Akhdari — corpus officiel 57 vidéos' AND (status<>'active' OR access_tier<>'free' OR distribution_authorized IS NOT TRUE OR published_at IS NULL)) THEN RAISE EXCEPTION 'AK-I07 resource access'; END IF; checks:=checks+1;
  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id='fc37b21a-4e7d-4382-80f4-62a659289ad0' AND organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f') THEN RAISE EXCEPTION 'AK-I08 subject reuse'; END IF; checks:=checks+1;
  IF NOT EXISTS (SELECT 1 FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821' AND subject_id='fc37b21a-4e7d-4382-80f4-62a659289ad0') THEN RAISE EXCEPTION 'AK-I09 book reuse'; END IF; checks:=checks+1;
  IF NOT EXISTS (SELECT 1 FROM public.sessions WHERE id='3a4023ae-8833-428c-ab39-29ac8ec389e5') OR NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='d06fdb43-b96a-481b-80e5-5a80f5c18fe3') THEN RAISE EXCEPTION 'AK-I10 video 6 UUID'; END IF; checks:=checks+1;
  IF NOT EXISTS (SELECT 1 FROM public.sessions WHERE id='2ac5821e-f89f-45d2-aa00-2bd6819363cf') OR NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='66f90cd1-a358-4d1f-ae6a-d7e0bfca1e24') THEN RAISE EXCEPTION 'AK-I11 video 7 UUID'; END IF; checks:=checks+1;
  IF (SELECT count(*) FROM public.quizzes WHERE id IN (SELECT legacy_quiz_id FROM public.activities WHERE status='draft' AND title LIKE 'Quiz brouillon — Séance %')) <> 57 THEN RAISE EXCEPTION 'AK-I12 quizzes'; END IF; checks:=checks+1;
  IF (SELECT count(*) FROM public.quiz_questions WHERE quiz_id IN (SELECT legacy_quiz_id FROM public.activities WHERE status='draft' AND title LIKE 'Quiz brouillon — Séance %')) <> 285 THEN RAISE EXCEPTION 'AK-I13 questions'; END IF; checks:=checks+1;
  IF EXISTS (SELECT q.id FROM public.quizzes q JOIN public.quiz_questions qq ON qq.quiz_id=q.id WHERE q.id IN (SELECT legacy_quiz_id FROM public.activities WHERE title LIKE 'Quiz brouillon — Séance %') GROUP BY q.id,q.passing_score HAVING count(*)<>5 OR sum(qq.points)<>100 OR q.passing_score<>80) THEN RAISE EXCEPTION 'AK-I14 scoring'; END IF; checks:=checks+1;
  IF EXISTS (SELECT 1 FROM public.quizzes WHERE id IN (SELECT legacy_quiz_id FROM public.activities WHERE title LIKE 'Quiz brouillon — Séance %') AND status<>'draft') THEN RAISE EXCEPTION 'AK-I15 quiz publication'; END IF; checks:=checks+1;
  IF EXISTS (SELECT 1 FROM public.activities WHERE title LIKE 'Quiz brouillon — Séance %' AND (status<>'draft' OR activity_type<>'quiz' OR requires_validation IS NOT TRUE)) THEN RAISE EXCEPTION 'AK-I16 activity state'; END IF; checks:=checks+1;
  IF (SELECT count(*) FROM public.lesson_resources WHERE source_name='Akhdari — corpus officiel 57 vidéos' AND provenance LIKE '%c67d35ed04d8d0ab650d7eb7ad4971e709cc1f6640f4ed32f6c541caf4d6e084%') <> 57 THEN RAISE EXCEPTION 'AK-I17 provenance'; END IF; checks:=checks+1;
  IF EXISTS (SELECT 1 FROM public.lessons l JOIN public.chapters c ON c.id=l.chapter_id WHERE c.book_id='cbfcd804-4499-4def-9496-7485e3fae821' AND l.organization_id<>c.organization_id) THEN RAISE EXCEPTION 'AK-I18 organization'; END IF; checks:=checks+1;
  IF EXISTS (SELECT 1 FROM public.sessions s JOIN public.lessons l ON l.id=s.lesson_id JOIN public.chapters c ON c.id=l.chapter_id WHERE c.book_id='cbfcd804-4499-4def-9496-7485e3fae821' AND s.organization_id<>l.organization_id) THEN RAISE EXCEPTION 'AK-I19 session organization'; END IF; checks:=checks+1;
  IF checks<>19 THEN RAISE EXCEPTION 'AK integrity harness count'; END IF;
END
$integrity$;

-- Published catalog is visible; editorial drafts are not public.
SET LOCAL ROLE anon;
DO $rls_public$
BEGIN
  IF (SELECT count(*) FROM public.chapters WHERE book_id='cbfcd804-4499-4def-9496-7485e3fae821')<>6 THEN RAISE EXCEPTION 'AK-RLS-01 public chapters'; END IF;
  IF (SELECT count(*) FROM public.sessions WHERE lesson_id IN (SELECT id FROM public.lessons WHERE chapter_id IN (SELECT id FROM public.chapters WHERE book_id='cbfcd804-4499-4def-9496-7485e3fae821')))<>57 THEN RAISE EXCEPTION 'AK-RLS-02 public sessions'; END IF;
  IF (SELECT count(*) FROM public.lesson_resources WHERE source_name='Akhdari — corpus officiel 57 vidéos')<>57 THEN RAISE EXCEPTION 'AK-RLS-03 public resources'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE title LIKE 'Quiz brouillon — Séance %') THEN RAISE EXCEPTION 'AK-RLS-04 draft activity visible'; END IF;
END
$rls_public$;
RESET ROLE;

-- Existing learner can read/start/complete; completion does not validate itself.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $rls_learner$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sessions WHERE id='891b3a4d-b651-59f7-b4e2-453d9903b4c9') THEN RAISE EXCEPTION 'AK-RLS-05 learner session'; END IF;
END
$rls_learner$;
INSERT INTO public.profile_session_progress (organization_id,profile_id,session_id)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','777cbdea-7c2c-430d-872f-26fa2d6e9088','891b3a4d-b651-59f7-b4e2-453d9903b4c9');
UPDATE public.profile_session_progress SET status='completed'
WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='891b3a4d-b651-59f7-b4e2-453d9903b4c9';
DO $rls_progress$
DECLARE rejected boolean:=false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='891b3a4d-b651-59f7-b4e2-453d9903b4c9' AND status='completed' AND validated_at IS NULL AND validated_by IS NULL) THEN RAISE EXCEPTION 'AK-RLS-06 completion'; END IF;
  BEGIN
    UPDATE public.profile_session_progress SET status='validated'
    WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='891b3a4d-b651-59f7-b4e2-453d9903b4c9';
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AK-RLS-07 self validation'; END IF;
END
$rls_progress$;
RESET ROLE;

-- A title correction must never detach or reset M8 progress.
UPDATE public.sessions SET title=title||' — test transactionnel' WHERE id='891b3a4d-b651-59f7-b4e2-453d9903b4c9';
DO $progress_title$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='891b3a4d-b651-59f7-b4e2-453d9903b4c9' AND status='completed') THEN RAISE EXCEPTION 'AK-P01 title reset progress'; END IF;
END
$progress_title$;

-- Sensitivity: an intentionally overbroad policy must make the negative draft
-- visibility assertion fail. The exception is caught, proving the probe is red.
CREATE POLICY akhdari_sensitivity_intentionally_overbroad ON public.activities FOR SELECT TO anon USING (true);
SET LOCAL ROLE anon;
DO $sensitivity$
DECLARE negative_probe_failed boolean:=false;
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM public.activities WHERE title LIKE 'Quiz brouillon — Séance %') THEN
      RAISE EXCEPTION 'intentional red: draft became visible';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    negative_probe_failed:=true;
  END;
  IF NOT negative_probe_failed THEN RAISE EXCEPTION 'AK-S01 sensitivity did not turn red'; END IF;
END
$sensitivity$;
RESET ROLE;
DROP POLICY akhdari_sensitivity_intentionally_overbroad ON public.activities;

SELECT 19 AS integrity_passed, 7 AS rls_passed, true AS sensitivity_passed;
