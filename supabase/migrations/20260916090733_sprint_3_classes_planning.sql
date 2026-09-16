-- Sprint 3: classes, configurable planning, live sessions and per-session attendance.
-- Existing technical `cohort` names are intentionally preserved for compatibility.

ALTER TABLE public.learner_profiles
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unspecified';

ALTER TABLE public.learner_profiles
  ADD CONSTRAINT learner_profiles_gender_check
  CHECK (gender IN ('female', 'male', 'unspecified'));

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS age_min smallint,
  ADD COLUMN IF NOT EXISTS age_max smallint,
  ADD COLUMN IF NOT EXISTS gender_policy text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS usual_weekday smallint,
  ADD COLUMN IF NOT EXISTS usual_start_time time,
  ADD COLUMN IF NOT EXISTS usual_end_time time;

ALTER TABLE public.cohorts
  ADD CONSTRAINT cohorts_age_range_check
    CHECK (
      (age_min IS NULL OR age_min BETWEEN 0 AND 120)
      AND (age_max IS NULL OR age_max BETWEEN 0 AND 120)
      AND (age_min IS NULL OR age_max IS NULL OR age_max >= age_min)
    ),
  ADD CONSTRAINT cohorts_gender_policy_check
    CHECK (gender_policy IN ('mixed', 'female_only', 'male_only')),
  ADD CONSTRAINT cohorts_usual_weekday_check
    CHECK (usual_weekday IS NULL OR usual_weekday BETWEEN 0 AND 6),
  ADD CONSTRAINT cohorts_usual_time_check
    CHECK (
      usual_start_time IS NULL
      OR usual_end_time IS NULL
      OR usual_end_time > usual_start_time
    ),
  ADD CONSTRAINT cohorts_audience_rules_check
    CHECK (
      audience IS NULL
      OR (audience = 'child' AND gender_policy = 'mixed' AND (age_min IS NULL OR age_min >= 6) AND (age_max IS NULL OR age_max <= 13))
      OR (audience = 'teen_female' AND gender_policy = 'female_only' AND (age_min IS NULL OR age_min >= 14) AND (age_max IS NULL OR age_max <= 17))
      OR (audience = 'teen_male' AND gender_policy = 'male_only' AND (age_min IS NULL OR age_min >= 14) AND (age_max IS NULL OR age_max <= 17))
      OR (audience = 'adult_female' AND gender_policy = 'female_only' AND (age_min IS NULL OR age_min >= 18))
      OR (audience = 'adult_male' AND gender_policy = 'male_only' AND (age_min IS NULL OR age_min >= 18))
    );

CREATE INDEX cohorts_subject_id_idx ON public.cohorts (subject_id);
CREATE INDEX cohorts_public_enrollment_idx
  ON public.cohorts (organization_id, enrollment_status, starts_on)
  WHERE is_public;

CREATE TABLE public.planning_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audience_group text NOT NULL CHECK (audience_group IN ('child', 'teen', 'adult')),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 100),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (organization_id, audience_group, weekday, starts_at, ends_at)
);

CREATE INDEX planning_preferences_org_audience_idx
  ON public.planning_preferences (organization_id, audience_group, weekday)
  WHERE active;

-- Business recommendations are initialized for every existing organization and remain editable.
INSERT INTO public.planning_preferences (organization_id, audience_group, weekday, starts_at, ends_at, label)
SELECT organization.id, seed.audience_group, seed.weekday, seed.starts_at, seed.ends_at, seed.label
FROM public.organizations AS organization
CROSS JOIN (
  VALUES
    ('child', 3, '13:00'::time, '18:00'::time, 'Mercredi après-midi'),
    ('child', 6, '08:00'::time, '18:00'::time, 'Samedi'),
    ('child', 0, '08:00'::time, '18:00'::time, 'Dimanche'),
    ('teen', 3, '13:00'::time, '18:00'::time, 'Mercredi après-midi'),
    ('teen', 6, '08:00'::time, '18:00'::time, 'Samedi'),
    ('teen', 0, '08:00'::time, '18:00'::time, 'Dimanche'),
    ('adult', 1, '18:00'::time, '23:00'::time, 'Lundi soir'),
    ('adult', 2, '18:00'::time, '23:00'::time, 'Mardi soir'),
    ('adult', 3, '18:00'::time, '23:00'::time, 'Mercredi soir'),
    ('adult', 4, '18:00'::time, '23:00'::time, 'Jeudi soir'),
    ('adult', 5, '18:00'::time, '23:00'::time, 'Vendredi soir'),
    ('adult', 6, '08:00'::time, '23:00'::time, 'Samedi'),
    ('adult', 0, '08:00'::time, '23:00'::time, 'Dimanche')
) AS seed(audience_group, weekday, starts_at, ends_at, label)
ON CONFLICT DO NOTHING;

CREATE TABLE public.teacher_availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  availability_type text NOT NULL DEFAULT 'available'
    CHECK (availability_type IN ('available', 'preferred', 'unavailable')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (organization_id, teacher_id, weekday, starts_at, ends_at)
);

CREATE INDEX teacher_availabilities_lookup_idx
  ON public.teacher_availabilities (organization_id, teacher_id, weekday);

ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_status_check;
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS attendance_requirement text NOT NULL DEFAULT 'required',
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS replay_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_attendees integer,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS conflict_override_reason text,
  ADD COLUMN IF NOT EXISTS conflict_overridden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conflict_overridden_at timestamptz;

ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_status_check
    CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled', 'rescheduled')),
  ADD CONSTRAINT live_sessions_attendance_requirement_check
    CHECK (attendance_requirement IN ('required', 'recommended', 'optional', 'not_required')),
  ADD CONSTRAINT live_sessions_max_attendees_check
    CHECK (max_attendees IS NULL OR max_attendees > 0),
  ADD CONSTRAINT live_sessions_override_complete_check
    CHECK (
      (conflict_override_reason IS NULL AND conflict_overridden_by IS NULL AND conflict_overridden_at IS NULL)
      OR (
        nullif(btrim(conflict_override_reason), '') IS NOT NULL
        AND conflict_overridden_by IS NOT NULL
        AND conflict_overridden_at IS NOT NULL
      )
    );

CREATE INDEX live_sessions_host_range_idx
  ON public.live_sessions (organization_id, host_user_id, starts_at, ends_at)
  WHERE status IN ('scheduled', 'live', 'rescheduled');
CREATE INDEX live_sessions_cohort_range_idx
  ON public.live_sessions (organization_id, cohort_id, starts_at, ends_at)
  WHERE status IN ('scheduled', 'live', 'rescheduled');
CREATE INDEX live_sessions_recurrence_group_idx
  ON public.live_sessions (recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;
CREATE INDEX live_sessions_missing_replay_idx
  ON public.live_sessions (organization_id, replay_due_at)
  WHERE replay_due_at IS NOT NULL AND replay_url IS NULL;

CREATE TABLE public.session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_required'
    CHECK (status IN ('present', 'excused_absence', 'unexcused_absence', 'late', 'excused', 'not_required')),
  note text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_session_id, learner_id)
);

CREATE INDEX session_attendance_learner_idx
  ON public.session_attendance (organization_id, learner_id, recorded_at DESC);
CREATE INDEX session_attendance_session_status_idx
  ON public.session_attendance (live_session_id, status);

CREATE TABLE public.attendance_history (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES public.session_attendance(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  note text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX attendance_history_attendance_idx
  ON public.attendance_history (attendance_id, changed_at DESC);

CREATE TABLE public.session_absence_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  reason text,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_session_id, learner_id)
);

CREATE INDEX session_absence_reports_session_idx
  ON public.session_absence_reports (live_session_id, created_at DESC);

CREATE TABLE public.planning_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  live_session_id uuid REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('technical', 'missing_link', 'replay', 'schedule', 'other')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 2 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX planning_incidents_org_status_idx
  ON public.planning_incidents (organization_id, status, created_at DESC);
CREATE INDEX planning_preferences_created_by_idx ON public.planning_preferences (created_by);
CREATE INDEX teacher_availabilities_teacher_id_idx ON public.teacher_availabilities (teacher_id);
CREATE INDEX teacher_availabilities_created_by_idx ON public.teacher_availabilities (created_by);
CREATE INDEX session_attendance_recorded_by_idx ON public.session_attendance (recorded_by);
CREATE INDEX attendance_history_changed_by_idx ON public.attendance_history (changed_by);
CREATE INDEX absence_reports_reported_by_idx ON public.session_absence_reports (reported_by);
CREATE INDEX planning_incidents_reported_by_idx ON public.planning_incidents (reported_by);
CREATE INDEX live_sessions_conflict_overridden_by_idx ON public.live_sessions (conflict_overridden_by);

CREATE OR REPLACE FUNCTION private.can_manage_planning(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.has_organization_role(
    p_organization_id,
    ARRAY['owner', 'admin', 'pedagogical_manager', 'class_manager']
  ) OR private.is_platform_administrator();
$$;

REVOKE ALL ON FUNCTION private.can_manage_planning(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_manage_planning(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_public_cohort()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_public AND (
    nullif(btrim(NEW.name), '') IS NULL
    OR nullif(btrim(COALESCE(NEW.code, '')), '') IS NULL
    OR NEW.audience IS NULL
    OR NEW.objective IS NULL
    OR cardinality(NEW.teaching_languages) = 0
    OR NEW.delivery_format IS NULL
    OR nullif(btrim(COALESCE(NEW.public_summary, '')), '') IS NULL
    OR NEW.max_students IS NULL
    OR (NEW.delivery_format <> 'on_demand' AND nullif(btrim(COALESCE(NEW.schedule_label, '')), '') IS NULL)
  ) THEN
    RAISE EXCEPTION 'Complétez le nom, le code, le public, l’objectif, les langues, le format, la capacité, le résumé et le créneau avant de rendre cette classe publique.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cohorts_validate_public_before_write
  BEFORE INSERT OR UPDATE ON public.cohorts
  FOR EACH ROW EXECUTE FUNCTION private.validate_public_cohort();

CREATE OR REPLACE FUNCTION private.validate_learner_class_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target public.cohorts%ROWTYPE;
  learner public.learner_profiles%ROWTYPE;
  learner_age integer;
BEGIN
  SELECT * INTO target FROM public.cohorts WHERE id = NEW.cohort_id;
  SELECT * INTO learner FROM public.learner_profiles WHERE id = NEW.learner_id;

  IF target.audience IS NULL THEN RETURN NEW; END IF;
  IF learner.birth_date IS NULL THEN
    RAISE EXCEPTION 'La date de naissance de l’élève est nécessaire pour vérifier cette classe.';
  END IF;

  learner_age := date_part('year', age(current_date, learner.birth_date));
  IF target.age_min IS NOT NULL AND learner_age < target.age_min THEN
    RAISE EXCEPTION 'L’élève est trop jeune pour cette classe.';
  END IF;
  IF target.age_max IS NOT NULL AND learner_age > target.age_max THEN
    RAISE EXCEPTION 'L’élève dépasse la tranche d’âge de cette classe.';
  END IF;
  IF target.gender_policy = 'female_only' AND learner.gender <> 'female' THEN
    RAISE EXCEPTION 'Cette classe est réservée aux filles ou aux femmes.';
  END IF;
  IF target.gender_policy = 'male_only' AND learner.gender <> 'male' THEN
    RAISE EXCEPTION 'Cette classe est réservée aux garçons ou aux hommes.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER learner_class_eligibility_before_write
  BEFORE INSERT OR UPDATE OF cohort_id, learner_id ON public.learner_cohort_memberships
  FOR EACH ROW EXECUTE FUNCTION private.validate_learner_class_eligibility();

REVOKE ALL ON FUNCTION private.validate_public_cohort() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_learner_class_eligibility() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_live_session_conflicts(
  p_organization_id uuid,
  p_cohort_id uuid,
  p_host_user_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE(code text, severity text, message text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.cohorts%ROWTYPE;
  enrolled_count integer;
  audience_group text;
  local_weekday smallint;
  local_start time;
  local_end time;
BEGIN
  IF NOT (
    private.can_manage_planning(p_organization_id)
    OR (p_cohort_id IS NOT NULL AND private.can_teach_cohort(p_cohort_id))
  ) THEN
    RAISE EXCEPTION 'Accès refusé au contrôle du planning.';
  END IF;
  IF p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RETURN QUERY SELECT 'invalid_range', 'error', 'L’heure de fin doit être après l’heure de début.';
    RETURN;
  END IF;

  SELECT * INTO target FROM public.cohorts
  WHERE id = p_cohort_id AND organization_id = p_organization_id;

  IF p_host_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.live_sessions AS session
    WHERE session.organization_id = p_organization_id
      AND session.host_user_id = p_host_user_id
      AND session.id IS DISTINCT FROM p_session_id
      AND session.status IN ('scheduled', 'live', 'rescheduled')
      AND tstzrange(session.starts_at, COALESCE(session.ends_at, session.starts_at + interval '1 hour'), '[)')
        && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RETURN QUERY SELECT 'teacher_busy', 'error', 'Ce professeur a déjà une séance sur ce créneau.';
  END IF;

  IF p_cohort_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.live_sessions AS session
    WHERE session.organization_id = p_organization_id
      AND session.cohort_id = p_cohort_id
      AND session.id IS DISTINCT FROM p_session_id
      AND session.status IN ('scheduled', 'live', 'rescheduled')
      AND tstzrange(session.starts_at, COALESCE(session.ends_at, session.starts_at + interval '1 hour'), '[)')
        && tstzrange(p_starts_at, p_ends_at, '[)')
  ) THEN
    RETURN QUERY SELECT 'class_busy', 'error', 'Cette classe a déjà une séance sur ce créneau.';
  END IF;

  IF p_host_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.teacher_availabilities AS availability
    WHERE availability.organization_id = p_organization_id
      AND availability.teacher_id = p_host_user_id
      AND availability.availability_type = 'unavailable'
      AND availability.weekday = extract(dow FROM p_starts_at AT TIME ZONE availability.timezone)
      AND (p_starts_at AT TIME ZONE availability.timezone)::time < availability.ends_at
      AND (p_ends_at AT TIME ZONE availability.timezone)::time > availability.starts_at
  ) THEN
    RETURN QUERY SELECT 'teacher_unavailable', 'error', 'Ce créneau est marqué indisponible par le professeur.';
  END IF;

  IF target.id IS NOT NULL THEN
    SELECT count(*) INTO enrolled_count
    FROM public.learner_cohort_memberships
    WHERE cohort_id = p_cohort_id AND status = 'active';
    IF target.max_students IS NOT NULL AND enrolled_count > target.max_students THEN
      RETURN QUERY SELECT 'capacity_exceeded', 'error', 'La capacité maximale de la classe est dépassée.';
    END IF;

    audience_group := CASE
      WHEN target.audience = 'child' THEN 'child'
      WHEN target.audience IN ('teen_female', 'teen_male') THEN 'teen'
      WHEN target.audience IN ('adult_female', 'adult_male') THEN 'adult'
      ELSE NULL
    END;
    local_weekday := extract(dow FROM p_starts_at AT TIME ZONE target.timezone);
    local_start := (p_starts_at AT TIME ZONE target.timezone)::time;
    local_end := (p_ends_at AT TIME ZONE target.timezone)::time;
    IF audience_group IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.planning_preferences AS preference
      WHERE preference.organization_id = p_organization_id
        AND preference.audience_group = audience_group
        AND preference.active
        AND preference.weekday = local_weekday
        AND preference.starts_at <= local_start
        AND preference.ends_at >= local_end
    ) THEN
      RETURN QUERY SELECT 'outside_recommended_hours', 'warning', 'Ce créneau est possible, mais il est en dehors des plages recommandées pour ce public.';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_live_session_conflicts(uuid, uuid, uuid, timestamptz, timestamptz, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_live_session_conflicts(uuid, uuid, uuid, timestamptz, timestamptz, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_live_session_planning()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  conflict_messages text;
BEGIN
  IF NEW.conflict_override_reason IS NOT NULL THEN
    IF NOT private.can_manage_planning(NEW.organization_id) THEN
      RAISE EXCEPTION 'Seul un responsable autorisé peut confirmer une exception de planning.';
    END IF;
    NEW.conflict_overridden_by := (SELECT auth.uid());
    NEW.conflict_overridden_at := now();
  ELSE
    NEW.conflict_overridden_by := NULL;
    NEW.conflict_overridden_at := NULL;
  END IF;

  IF NEW.status IN ('scheduled', 'live', 'rescheduled') THEN
    SELECT string_agg(conflict.message, ' ')
    INTO conflict_messages
    FROM public.check_live_session_conflicts(
      NEW.organization_id,
      NEW.cohort_id,
      NEW.host_user_id,
      NEW.starts_at,
      COALESCE(NEW.ends_at, NEW.starts_at + interval '1 hour'),
      NEW.id
    ) AS conflict
    WHERE conflict.severity = 'error';

    IF conflict_messages IS NOT NULL AND NEW.conflict_override_reason IS NULL THEN
      RAISE EXCEPTION '% Pour continuer, corrigez le créneau ou demandez une exception justifiée.', conflict_messages;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_live_session_planning() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER live_sessions_validate_planning_before_write
  BEFORE INSERT OR UPDATE OF organization_id, cohort_id, host_user_id, starts_at, ends_at, status, conflict_override_reason
  ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION private.validate_live_session_planning();

CREATE OR REPLACE FUNCTION private.validate_session_attendance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.live_sessions AS session
    JOIN public.learner_cohort_memberships AS membership
      ON membership.cohort_id = session.cohort_id
     AND membership.learner_id = NEW.learner_id
     AND membership.status = 'active'
    WHERE session.id = NEW.live_session_id
      AND session.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Cet élève n’est pas inscrit dans la classe de cette séance.';
  END IF;
  NEW.recorded_by := COALESCE((SELECT auth.uid()), NEW.recorded_by);
  NEW.recorded_at := CASE WHEN TG_OP = 'INSERT' THEN now() ELSE NEW.recorded_at END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_session_attendance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER session_attendance_validate_before_write
  BEFORE INSERT OR UPDATE ON public.session_attendance
  FOR EACH ROW EXECUTE FUNCTION private.validate_session_attendance();

CREATE OR REPLACE FUNCTION private.record_attendance_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.attendance_history (
    organization_id, attendance_id, old_status, new_status, note, changed_by
  ) VALUES (
    NEW.organization_id,
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    NEW.note,
    COALESCE((SELECT auth.uid()), NEW.recorded_by)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_attendance_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER session_attendance_record_history
  AFTER INSERT OR UPDATE OF status, note ON public.session_attendance
  FOR EACH ROW EXECUTE FUNCTION private.record_attendance_history();

CREATE OR REPLACE FUNCTION private.audit_planning_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row_data record;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  INSERT INTO public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    row_data.organization_id,
    (SELECT auth.uid()),
    lower(TG_OP),
    TG_TABLE_NAME,
    row_data.id::text,
    jsonb_build_object('source', 'sprint_3_planning')
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION private.audit_planning_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER live_sessions_audit AFTER INSERT OR UPDATE OR DELETE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION private.audit_planning_change();
CREATE TRIGGER session_attendance_audit AFTER INSERT OR UPDATE OR DELETE ON public.session_attendance
  FOR EACH ROW EXECUTE FUNCTION private.audit_planning_change();
CREATE TRIGGER planning_incidents_audit AFTER INSERT OR UPDATE OR DELETE ON public.planning_incidents
  FOR EACH ROW EXECUTE FUNCTION private.audit_planning_change();
CREATE TRIGGER cohorts_planning_audit AFTER INSERT OR UPDATE OR DELETE ON public.cohorts
  FOR EACH ROW EXECUTE FUNCTION private.audit_planning_change();

ALTER TABLE public.planning_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_absence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_incidents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.planning_preferences, public.teacher_availabilities,
  public.session_attendance, public.attendance_history,
  public.session_absence_reports, public.planning_incidents FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_availabilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_attendance TO authenticated;
GRANT SELECT ON public.attendance_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_absence_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.planning_incidents TO authenticated;

CREATE POLICY planning_preferences_read ON public.planning_preferences FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY planning_preferences_manage ON public.planning_preferences FOR ALL TO authenticated
  USING (private.can_manage_planning(organization_id))
  WITH CHECK (private.can_manage_planning(organization_id));

CREATE POLICY teacher_availabilities_read ON public.teacher_availabilities FOR SELECT TO authenticated
  USING (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));
CREATE POLICY teacher_availabilities_manage_own ON public.teacher_availabilities FOR ALL TO authenticated
  USING (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id))
  WITH CHECK (teacher_id = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));

CREATE POLICY session_attendance_read ON public.session_attendance FOR SELECT TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.live_sessions AS session
      WHERE session.id = session_attendance.live_session_id
        AND session.cohort_id IS NOT NULL
        AND private.can_teach_cohort(session.cohort_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.learner_profiles AS learner
      WHERE learner.id = session_attendance.learner_id
        AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY session_attendance_insert ON public.session_attendance FOR INSERT TO authenticated
  WITH CHECK (
    private.can_manage_planning(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.live_sessions AS session
      WHERE session.id = session_attendance.live_session_id
        AND session.cohort_id IS NOT NULL
        AND private.can_teach_cohort(session.cohort_id)
    )
  );
CREATE POLICY session_attendance_update ON public.session_attendance FOR UPDATE TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.live_sessions AS session
      WHERE session.id = session_attendance.live_session_id
        AND session.cohort_id IS NOT NULL
        AND private.can_teach_cohort(session.cohort_id)
    )
  )
  WITH CHECK (
    private.can_manage_planning(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.live_sessions AS session
      WHERE session.id = session_attendance.live_session_id
        AND session.cohort_id IS NOT NULL
        AND private.can_teach_cohort(session.cohort_id)
    )
  );
CREATE POLICY session_attendance_delete ON public.session_attendance FOR DELETE TO authenticated
  USING (private.can_manage_planning(organization_id));

CREATE POLICY attendance_history_read ON public.attendance_history FOR SELECT TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.session_attendance AS attendance
      JOIN public.live_sessions AS session ON session.id = attendance.live_session_id
      WHERE attendance.id = attendance_history.attendance_id
        AND session.cohort_id IS NOT NULL
        AND private.can_teach_cohort(session.cohort_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.session_attendance AS attendance
      JOIN public.learner_profiles AS learner ON learner.id = attendance.learner_id
      WHERE attendance.id = attendance_history.attendance_id
        AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY absence_reports_read ON public.session_absence_reports FOR SELECT TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR reported_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.live_sessions AS session
      WHERE session.id = session_absence_reports.live_session_id
        AND session.cohort_id IS NOT NULL
        AND private.can_teach_cohort(session.cohort_id)
    )
  );
CREATE POLICY absence_reports_insert ON public.session_absence_reports FOR INSERT TO authenticated
  WITH CHECK (
    reported_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.learner_profiles AS learner
      JOIN public.learner_cohort_memberships AS membership ON membership.learner_id = learner.id
      JOIN public.live_sessions AS session ON session.cohort_id = membership.cohort_id
      WHERE learner.id = session_absence_reports.learner_id
        AND session.id = session_absence_reports.live_session_id
        AND membership.status = 'active'
        AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY absence_reports_update ON public.session_absence_reports FOR UPDATE TO authenticated
  USING (reported_by = (SELECT auth.uid()) OR private.can_manage_planning(organization_id))
  WITH CHECK (reported_by = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));
CREATE POLICY absence_reports_delete ON public.session_absence_reports FOR DELETE TO authenticated
  USING (reported_by = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));

CREATE POLICY planning_incidents_read ON public.planning_incidents FOR SELECT TO authenticated
  USING (reported_by = (SELECT auth.uid()) OR private.can_manage_planning(organization_id));
CREATE POLICY planning_incidents_insert ON public.planning_incidents FOR INSERT TO authenticated
  WITH CHECK (reported_by = (SELECT auth.uid()) AND private.is_organization_member(organization_id));
CREATE POLICY planning_incidents_update ON public.planning_incidents FOR UPDATE TO authenticated
  USING (private.can_manage_planning(organization_id))
  WITH CHECK (private.can_manage_planning(organization_id));

-- Planning managers may organize sessions across the organization. Teachers stay scoped to assigned classes.
DROP POLICY IF EXISTS live_sessions_insert ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_update ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_delete ON public.live_sessions;
CREATE POLICY live_sessions_insert ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (
    private.can_manage_planning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND private.can_teach_cohort(cohort_id)
      AND (course_id IS NULL OR private.can_teach_course(course_id))
      AND (host_user_id IS NULL OR host_user_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY live_sessions_update ON public.live_sessions FOR UPDATE TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR (cohort_id IS NOT NULL AND private.can_teach_cohort(cohort_id))
  )
  WITH CHECK (
    private.can_manage_planning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND private.can_teach_cohort(cohort_id)
      AND (course_id IS NULL OR private.can_teach_course(course_id))
      AND (host_user_id IS NULL OR host_user_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY live_sessions_delete ON public.live_sessions FOR DELETE TO authenticated
  USING (private.can_manage_planning(organization_id));

-- Class managers can organize classes but cannot access unrelated content, payments or users.
DROP POLICY IF EXISTS cohorts_insert_for_managers ON public.cohorts;
DROP POLICY IF EXISTS cohorts_update_for_managers ON public.cohorts;
DROP POLICY IF EXISTS cohorts_delete_for_managers ON public.cohorts;
CREATE POLICY cohorts_insert_for_planning_managers ON public.cohorts FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_planning(organization_id));
CREATE POLICY cohorts_update_for_planning_managers ON public.cohorts FOR UPDATE TO authenticated
  USING (private.can_manage_planning(organization_id))
  WITH CHECK (private.can_manage_planning(organization_id));
CREATE POLICY cohorts_delete_for_planning_managers ON public.cohorts FOR DELETE TO authenticated
  USING (private.can_manage_planning(organization_id));

DROP POLICY IF EXISTS cohorts_read_for_authorized_members ON public.cohorts;
CREATE POLICY cohorts_read_for_authorized_members ON public.cohorts FOR SELECT TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR private.can_teach_cohort(id)
    OR EXISTS (
      SELECT 1 FROM public.cohort_memberships AS membership
      WHERE membership.cohort_id = cohorts.id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status IN ('active', 'completed')
    )
    OR EXISTS (
      SELECT 1
      FROM public.learner_cohort_memberships AS membership
      JOIN public.learner_profiles AS learner ON learner.id = membership.learner_id
      WHERE membership.cohort_id = cohorts.id
        AND membership.status = 'active'
        AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS live_sessions_read ON public.live_sessions;
CREATE POLICY live_sessions_read ON public.live_sessions FOR SELECT TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR (cohort_id IS NOT NULL AND private.can_teach_cohort(cohort_id))
    OR (
      cohort_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.learner_cohort_memberships AS membership
        JOIN public.learner_profiles AS learner ON learner.id = membership.learner_id
        WHERE membership.cohort_id = live_sessions.cohort_id
          AND membership.status = 'active'
          AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
      )
    )
    OR (cohort_id IS NULL AND course_id IS NOT NULL AND private.can_access_course(course_id))
  );

DROP POLICY IF EXISTS learner_profiles_read ON public.learner_profiles;
CREATE POLICY learner_profiles_read ON public.learner_profiles FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR guardian_user_id = (SELECT auth.uid())
    OR private.can_manage_planning(organization_id)
    OR private.can_teach_learner(id)
    OR private.is_platform_administrator()
  );

DROP POLICY IF EXISTS learner_cohort_memberships_read ON public.learner_cohort_memberships;
CREATE POLICY learner_cohort_memberships_read ON public.learner_cohort_memberships FOR SELECT TO authenticated
  USING (
    private.can_manage_planning(organization_id)
    OR private.can_teach_cohort(cohort_id)
    OR EXISTS (
      SELECT 1 FROM public.learner_profiles AS learner
      WHERE learner.id = learner_cohort_memberships.learner_id
        AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
    )
    OR private.is_platform_administrator()
  );
