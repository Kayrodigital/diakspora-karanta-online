REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM anon;

CREATE INDEX IF NOT EXISTS progress_lesson_organization_idx
  ON public.progress (lesson_id, organization_id);
