ALTER TABLE public.progress
  ADD CONSTRAINT progress_lesson_same_organization
  FOREIGN KEY (lesson_id, organization_id)
  REFERENCES public.lessons(id, organization_id);

DROP POLICY progress_write_own ON public.progress;
CREATE POLICY progress_write_own ON public.progress FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.has_organization_role(organization_id, ARRAY['learner'])
    AND lesson_id IS NOT NULL
    AND private.can_access_lesson(lesson_id)
  );

DROP POLICY progress_update_own ON public.progress;
CREATE POLICY progress_update_own ON public.progress FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.has_organization_role(organization_id, ARRAY['learner'])
    AND lesson_id IS NOT NULL
    AND private.can_access_lesson(lesson_id)
  );
