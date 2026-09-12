-- Karanta pedagogical core: catalog, cohorts, course access, lessons, media,
-- live sessions and assessments. Every record is tenant-scoped.

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  color text CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  subtitle text,
  author text,
  description text,
  cover_url text,
  source_language text NOT NULL DEFAULT 'fr',
  level text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS starts_on date,
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS max_students integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.cohorts
  ADD CONSTRAINT cohorts_status_check CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  ADD CONSTRAINT cohorts_capacity_check CHECK (max_students IS NULL OR max_students > 0),
  ADD CONSTRAINT cohorts_dates_check CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on);

ALTER TABLE public.cohorts ALTER COLUMN organization_id SET NOT NULL;
CREATE UNIQUE INDEX cohorts_organization_code_idx
  ON public.cohorts (organization_id, code)
  WHERE code IS NOT NULL;

CREATE TABLE public.cohort_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'learner'
    CHECK (role IN ('learner', 'class_manager', 'assistant_teacher')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'completed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, user_id, role)
);

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  learning_objectives text[] NOT NULL DEFAULT '{}'::text[],
  language text NOT NULL DEFAULT 'fr',
  level text,
  cover_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  access_scope text NOT NULL DEFAULT 'cohort'
    CHECK (access_scope IN ('organization', 'cohort', 'invite')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE public.course_cohorts (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (course_id, cohort_id)
);

CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'completed', 'suspended')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  enrolled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (course_id, user_id)
);

CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  available_from timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, order_index)
);

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.course_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'on_demand',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_preview boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_type_check CHECK (lesson_type IN ('on_demand', 'live', 'hybrid')),
  ADD CONSTRAINT lessons_status_check CHECK (status IN ('draft', 'published', 'archived')),
  ADD CONSTRAINT lessons_duration_check CHECK (duration_minutes IS NULL OR duration_minutes >= 0);

ALTER TABLE public.lessons ALTER COLUMN organization_id SET NOT NULL;

CREATE TABLE public.lesson_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  resource_type text NOT NULL
    CHECK (resource_type IN ('audio', 'video', 'youtube', 'document', 'link', 'text', 'replay')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text,
  external_url text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  transcript text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  allow_download boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('processing', 'active', 'failed', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (external_url IS NOT NULL OR storage_path IS NOT NULL OR resource_type = 'text'),
  UNIQUE (lesson_id, order_index)
);

CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text,
  provider text NOT NULL DEFAULT 'zoom'
    CHECK (provider IN ('zoom', 'google_meet', 'telegram', 'whatsapp', 'other')),
  join_url text,
  external_meeting_id text,
  host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  recording_status text NOT NULL DEFAULT 'not_requested'
    CHECK (recording_status IN ('not_requested', 'pending', 'processing', 'ready', 'failed')),
  replay_url text,
  reminder_sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score integer NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  max_attempts integer CHECK (max_attempts IS NULL OR max_attempts > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'single_choice'
    CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false', 'short_answer')),
  prompt text NOT NULL,
  explanation text,
  points integer NOT NULL DEFAULT 1 CHECK (points > 0),
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  UNIQUE (quiz_id, order_index)
);

CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  UNIQUE (question_id, order_index)
);

-- Keep answer keys out of the learner-readable option rows.
CREATE TABLE public.quiz_option_keys (
  option_id uuid PRIMARY KEY REFERENCES public.quiz_options(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL DEFAULT false
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score numeric(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  UNIQUE (quiz_id, user_id, attempt_number)
);

CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  text_answer text,
  is_correct boolean,
  points_awarded numeric(8,2),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX books_organization_subject_idx ON public.books (organization_id, subject_id);
CREATE INDEX cohort_memberships_cohort_user_idx ON public.cohort_memberships (cohort_id, user_id);
CREATE INDEX cohort_memberships_user_idx ON public.cohort_memberships (user_id);
CREATE INDEX courses_organization_status_idx ON public.courses (organization_id, status);
CREATE INDEX courses_subject_id_idx ON public.courses (subject_id);
CREATE INDEX courses_book_id_idx ON public.courses (book_id);
CREATE INDEX course_cohorts_cohort_id_idx ON public.course_cohorts (cohort_id);
CREATE INDEX course_enrollments_user_id_idx ON public.course_enrollments (user_id);
CREATE INDEX course_modules_course_order_idx ON public.course_modules (course_id, order_index);
CREATE INDEX lessons_course_order_idx ON public.lessons (course_id, module_id, order_index);
CREATE INDEX lessons_module_id_idx ON public.lessons (module_id);
CREATE INDEX lesson_resources_lesson_order_idx ON public.lesson_resources (lesson_id, order_index);
CREATE INDEX live_sessions_course_start_idx ON public.live_sessions (course_id, starts_at);
CREATE INDEX live_sessions_cohort_start_idx ON public.live_sessions (cohort_id, starts_at);
CREATE INDEX live_sessions_lesson_id_idx ON public.live_sessions (lesson_id);
CREATE INDEX live_sessions_host_user_id_idx ON public.live_sessions (host_user_id);
CREATE INDEX quizzes_lesson_id_idx ON public.quizzes (lesson_id);
CREATE INDEX quiz_questions_quiz_order_idx ON public.quiz_questions (quiz_id, order_index);
CREATE INDEX quiz_options_question_order_idx ON public.quiz_options (question_id, order_index);
CREATE INDEX quiz_option_keys_organization_idx ON public.quiz_option_keys (organization_id);
CREATE INDEX quiz_attempts_user_quiz_idx ON public.quiz_attempts (user_id, quiz_id);
CREATE INDEX quiz_answers_question_id_idx ON public.quiz_answers (question_id);

CREATE OR REPLACE FUNCTION private.can_manage_learning(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.has_organization_role(
    p_organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager', 'teacher']
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = p_course_id
      AND (
        private.can_manage_learning(course.organization_id)
        OR (
          course.status = 'published'
          AND private.is_organization_member(course.organization_id)
          AND (
            course.access_scope = 'organization'
            OR EXISTS (
              SELECT 1
              FROM public.course_enrollments AS enrollment
              WHERE enrollment.course_id = course.id
                AND enrollment.user_id = (SELECT auth.uid())
                AND enrollment.status IN ('active', 'completed')
            )
            OR EXISTS (
              SELECT 1
              FROM public.course_cohorts AS assignment
              JOIN public.cohort_memberships AS membership
                ON membership.cohort_id = assignment.cohort_id
              WHERE assignment.course_id = course.id
                AND membership.user_id = (SELECT auth.uid())
                AND membership.status IN ('active', 'completed')
            )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
    WHERE lesson.id = p_lesson_id
      AND (
        private.can_manage_learning(lesson.organization_id)
        OR (
          lesson.status = 'published'
          AND (
            (lesson.course_id IS NULL AND private.is_organization_member(lesson.organization_id))
            OR private.can_access_course(lesson.course_id)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_manage_learning(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_lesson(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_manage_learning(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_lesson(uuid) TO authenticated;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_option_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.subjects, public.books, public.cohort_memberships,
  public.courses, public.course_cohorts, public.course_enrollments,
  public.course_modules, public.lesson_resources, public.live_sessions,
  public.quizzes, public.quiz_questions, public.quiz_options, public.quiz_option_keys,
  public.quiz_attempts, public.quiz_answers FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subjects, public.books,
  public.cohort_memberships, public.courses, public.course_cohorts,
  public.course_enrollments, public.course_modules, public.lesson_resources,
  public.live_sessions, public.quizzes, public.quiz_questions,
  public.quiz_options, public.quiz_option_keys, public.quiz_attempts,
  public.quiz_answers TO authenticated;

CREATE POLICY subjects_read ON public.subjects FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY subjects_insert ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY subjects_update ON public.subjects FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY subjects_delete ON public.subjects FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY books_read ON public.books FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id));
CREATE POLICY books_insert ON public.books FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY books_update ON public.books FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY books_delete ON public.books FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY cohort_memberships_read ON public.cohort_memberships FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.can_manage_learning(organization_id)
    OR private.is_linked_parent(organization_id, user_id)
  );
CREATE POLICY cohort_memberships_insert ON public.cohort_memberships FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY cohort_memberships_update ON public.cohort_memberships FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY cohort_memberships_delete ON public.cohort_memberships FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY courses_read ON public.courses FOR SELECT TO authenticated
  USING (private.can_access_course(id));
CREATE POLICY courses_insert ON public.courses FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY courses_update ON public.courses FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY courses_delete ON public.courses FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY course_cohorts_read ON public.course_cohorts FOR SELECT TO authenticated
  USING (private.can_access_course(course_id));
CREATE POLICY course_cohorts_insert ON public.course_cohorts FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY course_cohorts_update ON public.course_cohorts FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY course_cohorts_delete ON public.course_cohorts FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY course_enrollments_read ON public.course_enrollments FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.can_manage_learning(organization_id)
    OR private.is_linked_parent(organization_id, user_id)
  );
CREATE POLICY course_enrollments_insert ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY course_enrollments_update ON public.course_enrollments FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY course_enrollments_delete ON public.course_enrollments FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY course_modules_read ON public.course_modules FOR SELECT TO authenticated
  USING (private.can_access_course(course_id));
CREATE POLICY course_modules_insert ON public.course_modules FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY course_modules_update ON public.course_modules FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY course_modules_delete ON public.course_modules FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

DROP POLICY IF EXISTS "lessons_read_for_organization_members" ON public.lessons;
CREATE POLICY lessons_read_for_course_access ON public.lessons FOR SELECT TO authenticated
  USING (private.can_access_lesson(id));

CREATE POLICY lesson_resources_read ON public.lesson_resources FOR SELECT TO authenticated
  USING (private.can_access_lesson(lesson_id));
CREATE POLICY lesson_resources_insert ON public.lesson_resources FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY lesson_resources_update ON public.lesson_resources FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY lesson_resources_delete ON public.lesson_resources FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY live_sessions_read ON public.live_sessions FOR SELECT TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (course_id IS NOT NULL AND private.can_access_course(course_id))
    OR (
      course_id IS NULL
      AND (
        (cohort_id IS NULL AND private.is_organization_member(organization_id))
        OR EXISTS (
          SELECT 1
          FROM public.cohort_memberships membership
          WHERE membership.cohort_id = live_sessions.cohort_id
            AND membership.status IN ('active', 'completed')
            AND (
              membership.user_id = (SELECT auth.uid())
              OR private.is_linked_parent(organization_id, membership.user_id)
            )
        )
      )
    )
  );
CREATE POLICY live_sessions_insert ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY live_sessions_update ON public.live_sessions FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY live_sessions_delete ON public.live_sessions FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY quizzes_read ON public.quizzes FOR SELECT TO authenticated
  USING (private.can_access_lesson(lesson_id));
CREATE POLICY quizzes_insert ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quizzes_update ON public.quizzes FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quizzes_delete ON public.quizzes FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY quiz_questions_read ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND private.can_access_lesson(q.lesson_id)));
CREATE POLICY quiz_questions_insert ON public.quiz_questions FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quiz_questions_update ON public.quiz_questions FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quiz_questions_delete ON public.quiz_questions FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));
CREATE POLICY quiz_options_read_without_answers ON public.quiz_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions question
      JOIN public.quizzes quiz ON quiz.id = question.quiz_id
      WHERE question.id = question_id AND private.can_access_lesson(quiz.lesson_id)
    )
  );
CREATE POLICY quiz_options_insert ON public.quiz_options FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quiz_options_update ON public.quiz_options FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quiz_options_delete ON public.quiz_options FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY quiz_option_keys_read ON public.quiz_option_keys FOR SELECT TO authenticated
  USING (private.can_manage_learning(organization_id));
CREATE POLICY quiz_option_keys_insert ON public.quiz_option_keys FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quiz_option_keys_update ON public.quiz_option_keys FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY quiz_option_keys_delete ON public.quiz_option_keys FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

CREATE POLICY quiz_attempts_read ON public.quiz_attempts FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.can_manage_learning(organization_id)
    OR private.is_linked_parent(organization_id, user_id)
  );
CREATE POLICY quiz_attempts_insert ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.quizzes quiz
      WHERE quiz.id = quiz_id AND private.can_access_lesson(quiz.lesson_id)
    )
  );
CREATE POLICY quiz_attempts_update ON public.quiz_attempts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.can_manage_learning(organization_id))
  WITH CHECK (user_id = (SELECT auth.uid()) OR private.can_manage_learning(organization_id));

CREATE POLICY quiz_answers_read ON public.quiz_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts attempt
      WHERE attempt.id = attempt_id
        AND (
          attempt.user_id = (SELECT auth.uid())
          OR private.can_manage_learning(attempt.organization_id)
          OR private.is_linked_parent(attempt.organization_id, attempt.user_id)
        )
    )
  );
CREATE POLICY quiz_answers_insert ON public.quiz_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts attempt
      WHERE attempt.id = attempt_id AND attempt.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY quiz_answers_update ON public.quiz_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts attempt
      WHERE attempt.id = attempt_id
        AND (attempt.user_id = (SELECT auth.uid()) OR private.can_manage_learning(attempt.organization_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts attempt
      WHERE attempt.id = attempt_id
        AND (attempt.user_id = (SELECT auth.uid()) OR private.can_manage_learning(attempt.organization_id))
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-media',
  'course-media',
  false,
  524288000,
  ARRAY[
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/webm', 'application/pdf',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY course_media_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1
      FROM public.lesson_resources resource
      WHERE resource.storage_path = name
        AND private.can_access_lesson(resource.lesson_id)
    )
  );

CREATE POLICY course_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id::text = (storage.foldername(name))[1]
        AND private.can_manage_learning(organization.id)
    )
  );

CREATE POLICY course_media_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id::text = (storage.foldername(name))[1]
        AND private.can_manage_learning(organization.id)
    )
  )
  WITH CHECK (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id::text = (storage.foldername(name))[1]
        AND private.can_manage_learning(organization.id)
    )
  );

CREATE POLICY course_media_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-media'
    AND EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id::text = (storage.foldername(name))[1]
        AND private.can_manage_learning(organization.id)
    )
  );

-- Composite constraints prevent references across tenant boundaries.
ALTER TABLE public.subjects ADD CONSTRAINT subjects_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.books ADD CONSTRAINT books_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.cohorts ADD CONSTRAINT cohorts_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.courses ADD CONSTRAINT courses_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.course_modules ADD CONSTRAINT course_modules_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.quiz_options ADD CONSTRAINT quiz_options_id_organization_unique UNIQUE (id, organization_id);
ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_id_organization_unique UNIQUE (id, organization_id);

ALTER TABLE public.books ADD CONSTRAINT books_subject_same_organization
  FOREIGN KEY (subject_id, organization_id) REFERENCES public.subjects(id, organization_id);
ALTER TABLE public.courses ADD CONSTRAINT courses_subject_same_organization
  FOREIGN KEY (subject_id, organization_id) REFERENCES public.subjects(id, organization_id);
ALTER TABLE public.courses ADD CONSTRAINT courses_book_same_organization
  FOREIGN KEY (book_id, organization_id) REFERENCES public.books(id, organization_id);
ALTER TABLE public.course_cohorts ADD CONSTRAINT course_cohorts_course_same_organization
  FOREIGN KEY (course_id, organization_id) REFERENCES public.courses(id, organization_id);
ALTER TABLE public.course_cohorts ADD CONSTRAINT course_cohorts_cohort_same_organization
  FOREIGN KEY (cohort_id, organization_id) REFERENCES public.cohorts(id, organization_id);
ALTER TABLE public.course_enrollments ADD CONSTRAINT course_enrollments_course_same_organization
  FOREIGN KEY (course_id, organization_id) REFERENCES public.courses(id, organization_id);
ALTER TABLE public.course_modules ADD CONSTRAINT course_modules_course_same_organization
  FOREIGN KEY (course_id, organization_id) REFERENCES public.courses(id, organization_id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_course_same_organization
  FOREIGN KEY (course_id, organization_id) REFERENCES public.courses(id, organization_id);
ALTER TABLE public.lessons ADD CONSTRAINT lessons_module_same_organization
  FOREIGN KEY (module_id, organization_id) REFERENCES public.course_modules(id, organization_id);
ALTER TABLE public.lesson_resources ADD CONSTRAINT lesson_resources_lesson_same_organization
  FOREIGN KEY (lesson_id, organization_id) REFERENCES public.lessons(id, organization_id);
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_course_same_organization
  FOREIGN KEY (course_id, organization_id) REFERENCES public.courses(id, organization_id);
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_lesson_same_organization
  FOREIGN KEY (lesson_id, organization_id) REFERENCES public.lessons(id, organization_id);
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_cohort_same_organization
  FOREIGN KEY (cohort_id, organization_id) REFERENCES public.cohorts(id, organization_id);
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_lesson_same_organization
  FOREIGN KEY (lesson_id, organization_id) REFERENCES public.lessons(id, organization_id);
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_quiz_same_organization
  FOREIGN KEY (quiz_id, organization_id) REFERENCES public.quizzes(id, organization_id);
ALTER TABLE public.quiz_options ADD CONSTRAINT quiz_options_question_same_organization
  FOREIGN KEY (question_id, organization_id) REFERENCES public.quiz_questions(id, organization_id);
ALTER TABLE public.quiz_option_keys ADD CONSTRAINT quiz_option_keys_option_same_organization
  FOREIGN KEY (option_id, organization_id) REFERENCES public.quiz_options(id, organization_id);
ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_quiz_same_organization
  FOREIGN KEY (quiz_id, organization_id) REFERENCES public.quizzes(id, organization_id);
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_attempt_same_organization
  FOREIGN KEY (attempt_id, organization_id) REFERENCES public.quiz_attempts(id, organization_id);
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_question_same_organization
  FOREIGN KEY (question_id, organization_id) REFERENCES public.quiz_questions(id, organization_id);
