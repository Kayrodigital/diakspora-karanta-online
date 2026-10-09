-- M6: canonical pedagogy (Subject -> Book -> Chapter -> Lesson -> Session).
-- Legacy courses, course_modules and lesson_resources remain intact.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.courses AS course
    LEFT JOIN public.subjects AS subject ON subject.id = course.subject_id
    WHERE course.subject_id IS NULL
       OR subject.id IS NULL
       OR subject.organization_id IS DISTINCT FROM course.organization_id
  ) THEN
    RAISE EXCEPTION 'M6 preflight: a course has no deterministic subject mapping.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.courses AS course
    JOIN public.books AS book ON book.id = course.book_id
    WHERE book.organization_id IS DISTINCT FROM course.organization_id
  ) THEN
    RAISE EXCEPTION 'M6 preflight: a course points to a book in another organization.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.courses AS course
    JOIN public.books AS collision ON collision.id = course.id
    WHERE course.book_id IS NULL
  ) THEN
    RAISE EXCEPTION 'M6 preflight: deterministic course-to-book UUID collision.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.course_modules AS module
    LEFT JOIN public.courses AS course ON course.id = module.course_id
    WHERE course.id IS NULL
       OR course.organization_id IS DISTINCT FROM module.organization_id
  ) THEN
    RAISE EXCEPTION 'M6 preflight: a module has no deterministic course mapping.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
    JOIN public.course_modules AS module ON module.id = lesson.module_id
    WHERE module.organization_id IS DISTINCT FROM lesson.organization_id
       OR lesson.course_id IS DISTINCT FROM module.course_id
  ) THEN
    RAISE EXCEPTION 'M6 preflight: a lesson/module/course mapping is incoherent.';
  END IF;
END
$$;

ALTER TABLE public.subjects DROP CONSTRAINT subjects_status_check;
UPDATE public.subjects SET status = 'published' WHERE status = 'active';
ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_status_check
  CHECK (status IN ('draft', 'review', 'published', 'archived'));

ALTER TABLE public.books DROP CONSTRAINT books_status_check;
ALTER TABLE public.books
  ADD COLUMN legacy_course_id uuid REFERENCES public.courses(id) ON DELETE RESTRICT,
  ADD COLUMN published_at timestamptz,
  ADD CONSTRAINT books_status_check
  CHECK (status IN ('draft', 'review', 'published', 'archived')),
  ADD CONSTRAINT books_legacy_course_id_key UNIQUE (legacy_course_id);

ALTER TABLE public.lessons DROP CONSTRAINT lessons_status_check;
ALTER TABLE public.lessons
  ADD COLUMN chapter_id uuid,
  ADD CONSTRAINT lessons_status_check
  CHECK (status IN ('draft', 'review', 'published', 'archived'));

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  legacy_course_module_id uuid UNIQUE REFERENCES public.course_modules(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, order_index),
  UNIQUE (id, organization_id)
);

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_chapter_id_fkey
    FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD CONSTRAINT lessons_chapter_same_organization
    FOREIGN KEY (chapter_id, organization_id)
    REFERENCES public.chapters(id, organization_id);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
  legacy_lesson_id uuid UNIQUE REFERENCES public.lessons(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  summary text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  access_tier text CHECK (access_tier IS NULL OR access_tier IN ('free', 'premium')),
  requires_validation boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, order_index),
  UNIQUE (id, organization_id)
);

CREATE INDEX chapters_organization_book_order_idx
  ON public.chapters (organization_id, book_id, order_index);
CREATE INDEX lessons_chapter_order_idx
  ON public.lessons (chapter_id, order_index) WHERE chapter_id IS NOT NULL;
CREATE INDEX sessions_organization_lesson_order_idx
  ON public.sessions (organization_id, lesson_id, order_index);

-- One deterministic book per legacy course without a usable book. Reusing the
-- course UUID makes the mapping stable across dry-runs without changing it.
INSERT INTO public.books (
  id, organization_id, subject_id, legacy_course_id, title, description,
  cover_url, source_language, level, status, metadata, created_by,
  published_at, created_at, updated_at
)
SELECT
  course.id,
  course.organization_id,
  course.subject_id,
  course.id,
  course.title,
  course.description,
  course.cover_url,
  course.language,
  course.level,
  CASE course.status
    WHEN 'published' THEN 'published'
    WHEN 'archived' THEN 'archived'
    ELSE 'draft'
  END,
  jsonb_build_object(
    'migration', 'M6',
    'legacy_course_id', course.id,
    'legacy_course_slug', course.slug
  ),
  course.created_by,
  CASE WHEN course.status = 'published' THEN course.published_at END,
  course.created_at,
  course.updated_at
FROM public.courses AS course
WHERE course.book_id IS NULL;

UPDATE public.courses AS course
SET book_id = course.id
WHERE course.book_id IS NULL;

-- A legacy module becomes exactly one chapter and keeps the same UUID.
INSERT INTO public.chapters (
  id, organization_id, book_id, legacy_course_module_id, title, description,
  order_index, status, created_by, published_at, created_at, updated_at
)
SELECT
  module.id,
  module.organization_id,
  course.book_id,
  module.id,
  module.title,
  module.description,
  module.order_index,
  CASE module.status
    WHEN 'published' THEN 'published'
    WHEN 'archived' THEN 'archived'
    ELSE 'draft'
  END,
  course.created_by,
  CASE WHEN module.status = 'published' THEN coalesce(course.published_at, module.created_at) END,
  module.created_at,
  module.updated_at
FROM public.course_modules AS module
JOIN public.courses AS course ON course.id = module.course_id;

UPDATE public.lessons AS lesson
SET chapter_id = chapter.id
FROM public.chapters AS chapter
WHERE chapter.legacy_course_module_id = lesson.module_id;

-- Every legacy lesson receives one shell session. Access tier intentionally
-- remains NULL: the legacy schema has no reliable free/premium fact.
INSERT INTO public.sessions (
  id, organization_id, lesson_id, legacy_lesson_id, title, summary,
  order_index, duration_minutes, access_tier, requires_validation, status,
  version, created_by, published_at, created_at, updated_at
)
SELECT
  lesson.id,
  lesson.organization_id,
  lesson.id,
  lesson.id,
  lesson.title,
  lesson.summary,
  0,
  lesson.duration_minutes,
  NULL,
  EXISTS (SELECT 1 FROM public.quizzes AS quiz WHERE quiz.lesson_id = lesson.id),
  lesson.status,
  1,
  lesson.created_by,
  CASE WHEN lesson.status = 'published' THEN lesson.created_at END,
  lesson.created_at,
  lesson.updated_at
FROM public.lessons AS lesson;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
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
    RAISE EXCEPTION 'M6 backfill: a used lesson remains outside the canonical chapter tree.';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.set_pedagogy_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TRIGGER chapters_set_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION private.set_pedagogy_updated_at();

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION private.set_pedagogy_updated_at();

-- Technical administrators are deliberately excluded from pedagogical
-- editorial rights. Owner/admin remain business administrators; the dedicated
-- content role is pedagogical_manager.
CREATE OR REPLACE FUNCTION private.can_manage_learning(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.has_organization_role(
    p_organization_id,
    ARRAY['owner', 'admin', 'pedagogical_manager']
  );
$$;

CREATE OR REPLACE FUNCTION private.can_teach_course(p_course_id uuid)
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
        OR EXISTS (
          SELECT 1
          FROM public.course_cohorts AS assignment
          WHERE assignment.course_id = course.id
            AND private.can_teach_cohort(assignment.cohort_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_prepare_book(p_book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.books AS book
    WHERE book.id = p_book_id
      AND (
        private.can_manage_learning(book.organization_id)
        OR (
          book.status = 'draft'
          AND book.created_by = (SELECT auth.uid())
          AND (
            private.has_organization_role(
              book.organization_id,
              ARRAY['teacher', 'class_manager']
            )
            OR EXISTS (
              SELECT 1 FROM public.courses AS course
              WHERE course.book_id = book.id
                AND private.can_teach_course(course.id)
            )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_prepare_chapter(p_chapter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chapters AS chapter
    WHERE chapter.id = p_chapter_id
      AND (
        private.can_manage_learning(chapter.organization_id)
        OR (
          chapter.status = 'draft'
          AND chapter.created_by = (SELECT auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.courses AS course
            WHERE course.book_id = chapter.book_id
              AND (
                private.can_edit_course(course.id)
                OR private.can_teach_course(course.id)
              )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_prepare_lesson(p_lesson_id uuid)
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
          lesson.status = 'draft'
          AND lesson.created_by = (SELECT auth.uid())
          AND lesson.course_id IS NOT NULL
          AND (
            private.can_edit_course(lesson.course_id)
            OR private.can_teach_course(lesson.course_id)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_prepare_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions AS session
    JOIN public.lessons AS lesson ON lesson.id = session.lesson_id
    WHERE session.id = p_session_id
      AND (
        private.can_manage_learning(session.organization_id)
        OR (
          session.status = 'draft'
          AND session.created_by = (SELECT auth.uid())
          AND lesson.course_id IS NOT NULL
          AND (
            private.can_edit_course(lesson.course_id)
            OR private.can_teach_course(lesson.course_id)
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.set_pedagogy_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_prepare_book(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_prepare_chapter(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_prepare_lesson(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_prepare_session(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_prepare_book(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_prepare_chapter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_prepare_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_prepare_session(uuid) TO authenticated;

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chapters, public.sessions FROM anon, authenticated;
GRANT SELECT ON TABLE public.subjects, public.books, public.chapters, public.sessions TO anon;
GRANT SELECT (
  id, organization_id, chapter_id, title, duration_minutes, order_index,
  summary, lesson_type, status, is_preview, created_at, updated_at
) ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chapters, public.sessions TO authenticated;
GRANT ALL ON TABLE public.chapters, public.sessions TO service_role;

-- Only the public Diakspora flag is exposed, using column privileges.
GRANT SELECT (id, slug, feature_flags) ON public.organizations TO anon;
DROP POLICY IF EXISTS organizations_public_feature_flags ON public.organizations;
CREATE POLICY organizations_public_feature_flags
ON public.organizations FOR SELECT TO anon
USING (slug = 'diakspora');

DROP POLICY IF EXISTS subjects_read ON public.subjects;
CREATE POLICY subjects_read_public
ON public.subjects FOR SELECT TO anon
USING (status = 'published');
CREATE POLICY subjects_read_authenticated
ON public.subjects FOR SELECT TO authenticated
USING (status = 'published' OR private.can_manage_learning(organization_id));

DROP POLICY IF EXISTS books_read ON public.books;
CREATE POLICY books_read_public
ON public.books FOR SELECT TO anon
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1 FROM public.subjects AS subject
    WHERE subject.id = books.subject_id AND subject.status = 'published'
  )
);
CREATE POLICY books_read_authenticated
ON public.books FOR SELECT TO authenticated
USING (
  (status = 'published' AND EXISTS (
    SELECT 1 FROM public.subjects AS subject
    WHERE subject.id = books.subject_id AND subject.status = 'published'
  ))
  OR private.can_prepare_book(id)
);
DROP POLICY IF EXISTS books_insert ON public.books;
CREATE POLICY books_insert
ON public.books FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (
    status = 'draft'
    AND created_by = (SELECT auth.uid())
    AND private.has_organization_role(
      organization_id, ARRAY['teacher', 'class_manager']
    )
  )
);
DROP POLICY IF EXISTS books_update ON public.books;
CREATE POLICY books_update
ON public.books FOR UPDATE TO authenticated
USING (private.can_prepare_book(id))
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (status = 'draft' AND created_by = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS books_delete ON public.books;
CREATE POLICY books_delete
ON public.books FOR DELETE TO authenticated
USING (private.can_prepare_book(id));

CREATE POLICY chapters_read_public
ON public.chapters FOR SELECT TO anon
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1 FROM public.books AS book
    WHERE book.id = chapters.book_id AND book.status = 'published'
  )
);
CREATE POLICY chapters_read_authenticated
ON public.chapters FOR SELECT TO authenticated
USING (
  (status = 'published' AND EXISTS (
    SELECT 1 FROM public.books AS book
    WHERE book.id = chapters.book_id AND book.status = 'published'
  ))
  OR private.can_prepare_chapter(id)
);
CREATE POLICY chapters_insert
ON public.chapters FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (
    status = 'draft'
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.courses AS course
      WHERE course.book_id = chapters.book_id
        AND (private.can_edit_course(course.id) OR private.can_teach_course(course.id))
    )
  )
);
CREATE POLICY chapters_update
ON public.chapters FOR UPDATE TO authenticated
USING (private.can_prepare_chapter(id))
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (status = 'draft' AND created_by = (SELECT auth.uid()))
);
CREATE POLICY chapters_delete
ON public.chapters FOR DELETE TO authenticated
USING (private.can_prepare_chapter(id));

DROP POLICY IF EXISTS lessons_read_for_course_access ON public.lessons;
CREATE POLICY lessons_read_public
ON public.lessons FOR SELECT TO anon
USING (
  status = 'published'
  AND chapter_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.chapters AS chapter
    JOIN public.books AS book ON book.id = chapter.book_id
    WHERE chapter.id = lessons.chapter_id
      AND chapter.status = 'published'
      AND book.status = 'published'
  )
);
CREATE POLICY lessons_read_authenticated
ON public.lessons FOR SELECT TO authenticated
USING (
  (status = 'published' AND chapter_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.chapters AS chapter
    JOIN public.books AS book ON book.id = chapter.book_id
    WHERE chapter.id = lessons.chapter_id
      AND chapter.status = 'published'
      AND book.status = 'published'
  ))
  OR private.can_prepare_lesson(id)
  OR private.can_access_lesson(id)
);
DROP POLICY IF EXISTS lessons_insert_for_course_editor ON public.lessons;
CREATE POLICY lessons_insert_for_course_editor
ON public.lessons FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (
    status = 'draft'
    AND created_by = (SELECT auth.uid())
    AND course_id IS NOT NULL
    AND (private.can_edit_course(course_id) OR private.can_teach_course(course_id))
  )
);
DROP POLICY IF EXISTS lessons_update_for_course_editor ON public.lessons;
CREATE POLICY lessons_update_for_course_editor
ON public.lessons FOR UPDATE TO authenticated
USING (private.can_prepare_lesson(id))
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (status = 'draft' AND created_by = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS lessons_delete_for_course_editor ON public.lessons;
CREATE POLICY lessons_delete_for_course_editor
ON public.lessons FOR DELETE TO authenticated
USING (private.can_prepare_lesson(id));

CREATE POLICY sessions_read_public
ON public.sessions FOR SELECT TO anon
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
    JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
    JOIN public.books AS book ON book.id = chapter.book_id
    WHERE lesson.id = sessions.lesson_id
      AND lesson.status = 'published'
      AND chapter.status = 'published'
      AND book.status = 'published'
  )
);
CREATE POLICY sessions_read_authenticated
ON public.sessions FOR SELECT TO authenticated
USING (
  (status = 'published' AND EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
    JOIN public.chapters AS chapter ON chapter.id = lesson.chapter_id
    JOIN public.books AS book ON book.id = chapter.book_id
    WHERE lesson.id = sessions.lesson_id
      AND lesson.status = 'published'
      AND chapter.status = 'published'
      AND book.status = 'published'
  ))
  OR private.can_prepare_session(id)
);
CREATE POLICY sessions_insert
ON public.sessions FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (
    status = 'draft'
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lessons AS lesson
      WHERE lesson.id = sessions.lesson_id
        AND lesson.course_id IS NOT NULL
        AND (private.can_edit_course(lesson.course_id) OR private.can_teach_course(lesson.course_id))
    )
  )
);
CREATE POLICY sessions_update
ON public.sessions FOR UPDATE TO authenticated
USING (private.can_prepare_session(id))
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (status = 'draft' AND created_by = (SELECT auth.uid()))
);
CREATE POLICY sessions_delete
ON public.sessions FOR DELETE TO authenticated
USING (private.can_prepare_session(id));

UPDATE public.organizations
SET feature_flags = coalesce(feature_flags, '{}'::jsonb)
  || jsonb_build_object('pedagogy_v1', false)
WHERE id = '390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND slug = 'diakspora';
