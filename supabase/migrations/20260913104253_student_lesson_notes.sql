-- Private notes written by a learner while studying a lesson.
CREATE TABLE public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  lesson_id uuid NOT NULL,
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, lesson_id),
  FOREIGN KEY (lesson_id, organization_id)
    REFERENCES public.lessons(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX lesson_notes_user_lesson_idx
  ON public.lesson_notes (user_id, lesson_id);

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lesson_notes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_notes TO authenticated;

CREATE POLICY lesson_notes_read_own
  ON public.lesson_notes FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
  );

CREATE POLICY lesson_notes_insert_own
  ON public.lesson_notes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      WHERE lesson.id = lesson_id
        AND lesson.organization_id = organization_id
    )
  );

CREATE POLICY lesson_notes_update_own
  ON public.lesson_notes FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
  );

CREATE POLICY lesson_notes_delete_own
  ON public.lesson_notes FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
  );
