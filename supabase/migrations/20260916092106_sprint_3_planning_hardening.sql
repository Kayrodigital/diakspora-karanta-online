-- Advisor-driven Sprint 3 hardening: covering indexes and one policy per action.

CREATE INDEX attendance_history_organization_id_idx
  ON public.attendance_history (organization_id);
CREATE INDEX planning_incidents_live_session_id_idx
  ON public.planning_incidents (live_session_id)
  WHERE live_session_id IS NOT NULL;
CREATE INDEX session_absence_reports_learner_id_idx
  ON public.session_absence_reports (learner_id);
CREATE INDEX session_absence_reports_organization_id_idx
  ON public.session_absence_reports (organization_id);
CREATE INDEX session_attendance_learner_id_idx
  ON public.session_attendance (learner_id);

DROP POLICY IF EXISTS planning_preferences_manage ON public.planning_preferences;
CREATE POLICY planning_preferences_insert ON public.planning_preferences FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_planning(organization_id));
CREATE POLICY planning_preferences_update ON public.planning_preferences FOR UPDATE TO authenticated
  USING (private.can_manage_planning(organization_id))
  WITH CHECK (private.can_manage_planning(organization_id));
CREATE POLICY planning_preferences_delete ON public.planning_preferences FOR DELETE TO authenticated
  USING (private.can_manage_planning(organization_id));

DROP POLICY IF EXISTS teacher_availabilities_manage_own ON public.teacher_availabilities;
CREATE POLICY teacher_availabilities_insert ON public.teacher_availabilities FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));
CREATE POLICY teacher_availabilities_update ON public.teacher_availabilities FOR UPDATE TO authenticated
  USING (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id))
  WITH CHECK (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));
CREATE POLICY teacher_availabilities_delete ON public.teacher_availabilities FOR DELETE TO authenticated
  USING (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));

-- RLS already restricts every table queried by this function, so invoker rights are sufficient.
ALTER FUNCTION public.check_live_session_conflicts(uuid, uuid, uuid, timestamptz, timestamptz, uuid)
  SECURITY INVOKER;
