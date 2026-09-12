-- Make internal access explicit, remove overlapping permissive policies and
-- cover every foreign key used by joins or cascades.

GRANT SELECT ON TABLE public.platform_administrators TO authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

CREATE POLICY "platform_administrators_read_for_platform_admins"
  ON public.platform_administrators FOR SELECT TO authenticated
  USING (private.is_platform_administrator());

CREATE POLICY "audit_logs_read_for_authorized_staff"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    private.is_platform_administrator()
    OR (
      organization_id IS NOT NULL
      AND private.has_organization_role(
        organization_id,
        ARRAY['owner', 'admin', 'technician']
      )
    )
  );

DROP POLICY IF EXISTS "lessons_manage_for_teaching_staff" ON public.lessons;

CREATE POLICY "lessons_insert_for_teaching_staff"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ));

CREATE POLICY "lessons_update_for_teaching_staff"
  ON public.lessons FOR UPDATE TO authenticated
  USING (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ))
  WITH CHECK (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ));

CREATE POLICY "lessons_delete_for_teaching_staff"
  ON public.lessons FOR DELETE TO authenticated
  USING (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ));

DROP POLICY IF EXISTS "cohorts_manage_for_staff" ON public.cohorts;

CREATE POLICY "cohorts_insert_for_staff"
  ON public.cohorts FOR INSERT TO authenticated
  WITH CHECK (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ));

CREATE POLICY "cohorts_update_for_staff"
  ON public.cohorts FOR UPDATE TO authenticated
  USING (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ))
  WITH CHECK (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ));

CREATE POLICY "cohorts_delete_for_staff"
  ON public.cohorts FOR DELETE TO authenticated
  USING (private.has_organization_role(
    organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  ));

CREATE INDEX IF NOT EXISTS attendance_user_id_idx
  ON public.attendance (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx
  ON public.audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS cohorts_teacher_id_idx
  ON public.cohorts (teacher_id);
CREATE INDEX IF NOT EXISTS family_relationships_created_by_idx
  ON public.family_relationships (created_by);
CREATE INDEX IF NOT EXISTS family_relationships_learner_user_id_idx
  ON public.family_relationships (learner_user_id);
CREATE INDEX IF NOT EXISTS family_relationships_parent_user_id_idx
  ON public.family_relationships (parent_user_id);
CREATE INDEX IF NOT EXISTS homework_submissions_lesson_id_idx
  ON public.homework_submissions (lesson_id);
CREATE INDEX IF NOT EXISTS homework_submissions_user_id_idx
  ON public.homework_submissions (user_id);
CREATE INDEX IF NOT EXISTS organization_memberships_invited_by_idx
  ON public.organization_memberships (invited_by);
CREATE INDEX IF NOT EXISTS organizations_created_by_idx
  ON public.organizations (created_by);
CREATE INDEX IF NOT EXISTS profiles_parent_id_idx
  ON public.profiles (parent_id);
CREATE INDEX IF NOT EXISTS progress_lesson_id_idx
  ON public.progress (lesson_id);
CREATE INDEX IF NOT EXISTS quiz_results_lesson_id_idx
  ON public.quiz_results (lesson_id);
CREATE INDEX IF NOT EXISTS quiz_results_user_id_idx
  ON public.quiz_results (user_id);
CREATE INDEX IF NOT EXISTS regularity_score_organization_id_idx
  ON public.regularity_score (organization_id);
