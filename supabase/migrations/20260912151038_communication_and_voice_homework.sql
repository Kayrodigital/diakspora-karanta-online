-- Lot 3: private pedagogical conversations, technical support, and voice homework.

ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS feedback_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feedback_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.homework_submissions
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN type SET DEFAULT 'audio',
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'submitted',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.homework_submissions
  DROP CONSTRAINT IF EXISTS homework_submissions_duration_seconds_check,
  ADD CONSTRAINT homework_submissions_duration_seconds_check
    CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 1800),
  DROP CONSTRAINT IF EXISTS homework_submissions_type_check,
  ADD CONSTRAINT homework_submissions_type_check
    CHECK (type IN ('audio', 'photo', 'document')),
  DROP CONSTRAINT IF EXISTS homework_submissions_status_check,
  ADD CONSTRAINT homework_submissions_status_check
    CHECK (status IN ('submitted', 'in_review', 'graded', 'resubmit_requested'));

CREATE INDEX IF NOT EXISTS homework_submissions_review_queue_idx
  ON public.homework_submissions (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS homework_submissions_feedback_by_idx
  ON public.homework_submissions (feedback_by);

REVOKE UPDATE ON TABLE public.homework_submissions FROM authenticated;
GRANT UPDATE (status, feedback_text, feedback_by, feedback_at, updated_at)
  ON TABLE public.homework_submissions TO authenticated;

CREATE TABLE IF NOT EXISTS public.pedagogical_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedagogical_conversations_learner_idx
  ON public.pedagogical_conversations (learner_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS pedagogical_conversations_teacher_idx
  ON public.pedagogical_conversations (teacher_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS pedagogical_conversations_created_by_idx
  ON public.pedagogical_conversations (created_by);
CREATE INDEX IF NOT EXISTS pedagogical_conversations_organization_idx
  ON public.pedagogical_conversations (organization_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.pedagogical_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.pedagogical_conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedagogical_messages_conversation_idx
  ON public.pedagogical_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS pedagogical_messages_sender_idx
  ON public.pedagogical_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS pedagogical_messages_organization_idx
  ON public.pedagogical_messages (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'technical' CHECK (category IN ('technical', 'account', 'billing', 'other')),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_requester_idx
  ON public.support_tickets (requester_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx
  ON public.support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS support_tickets_organization_status_idx
  ON public.support_tickets (organization_id, status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
  ON public.support_messages (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS support_messages_sender_idx
  ON public.support_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS support_messages_organization_idx
  ON public.support_messages (organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.is_teacher_for_learner(
  p_teacher_user_id uuid,
  p_learner_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learner_profiles AS learner
    JOIN public.organization_memberships AS teacher_membership
      ON teacher_membership.organization_id = learner.organization_id
     AND teacher_membership.user_id = p_teacher_user_id
     AND teacher_membership.status = 'active'
    WHERE learner.id = p_learner_id
      AND (
        teacher_membership.role IN ('owner', 'admin', 'technician', 'pedagogical_manager')
        OR EXISTS (
          SELECT 1
          FROM public.learner_cohort_memberships AS learner_membership
          JOIN public.cohorts AS cohort ON cohort.id = learner_membership.cohort_id
          WHERE learner_membership.learner_id = learner.id
            AND learner_membership.status = 'active'
            AND (
              cohort.teacher_id = p_teacher_user_id
              OR EXISTS (
                SELECT 1
                FROM public.cohort_memberships AS staff_membership
                WHERE staff_membership.cohort_id = cohort.id
                  AND staff_membership.user_id = p_teacher_user_id
                  AND staff_membership.status = 'active'
                  AND staff_membership.role IN ('class_manager', 'assistant_teacher')
              )
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_pedagogical_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pedagogical_conversations AS conversation
    JOIN public.learner_profiles AS learner ON learner.id = conversation.learner_id
    WHERE conversation.id = p_conversation_id
      AND private.is_organization_member(conversation.organization_id)
      AND (
        learner.user_id = (SELECT auth.uid())
        OR learner.guardian_user_id = (SELECT auth.uid())
        OR conversation.teacher_user_id = (SELECT auth.uid())
        OR private.can_manage_learning(conversation.organization_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_support_ticket(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.support_tickets AS ticket
    WHERE ticket.id = p_ticket_id
      AND private.is_organization_member(ticket.organization_id)
      AND (
        ticket.requester_user_id = (SELECT auth.uid())
        OR private.has_organization_role(
          ticket.organization_id,
          ARRAY['owner', 'admin', 'technician']
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_teacher_for_learner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_pedagogical_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_support_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_teacher_for_learner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_pedagogical_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_support_ticket(uuid) TO authenticated;

ALTER TABLE public.pedagogical_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedagogical_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pedagogical_conversations FROM anon, authenticated;
REVOKE ALL ON TABLE public.pedagogical_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_tickets FROM anon, authenticated;
REVOKE ALL ON TABLE public.support_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.pedagogical_conversations TO authenticated;
GRANT UPDATE (subject, status, last_message_at, updated_at)
  ON TABLE public.pedagogical_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.pedagogical_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON TABLE public.support_messages TO authenticated;
GRANT ALL ON TABLE public.pedagogical_conversations TO service_role;
GRANT ALL ON TABLE public.pedagogical_messages TO service_role;
GRANT ALL ON TABLE public.support_tickets TO service_role;
GRANT ALL ON TABLE public.support_messages TO service_role;

CREATE POLICY pedagogical_conversations_read
  ON public.pedagogical_conversations FOR SELECT TO authenticated
  USING (private.can_access_pedagogical_conversation(id));

CREATE POLICY pedagogical_conversations_insert
  ON public.pedagogical_conversations FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
    AND private.is_teacher_for_learner(teacher_user_id, learner_id)
    AND EXISTS (
      SELECT 1
      FROM public.learner_profiles AS learner
      WHERE learner.id = learner_id
        AND learner.organization_id = organization_id
        AND (
          learner.user_id = (SELECT auth.uid())
          OR learner.guardian_user_id = (SELECT auth.uid())
          OR teacher_user_id = (SELECT auth.uid())
          OR private.can_manage_learning(organization_id)
        )
    )
  );

CREATE POLICY pedagogical_conversations_update
  ON public.pedagogical_conversations FOR UPDATE TO authenticated
  USING (private.can_access_pedagogical_conversation(id))
  WITH CHECK (
    private.can_access_pedagogical_conversation(id)
    AND private.is_teacher_for_learner(teacher_user_id, learner_id)
  );

CREATE POLICY pedagogical_messages_read
  ON public.pedagogical_messages FOR SELECT TO authenticated
  USING (
    private.can_access_pedagogical_conversation(conversation_id)
    AND EXISTS (
      SELECT 1 FROM public.pedagogical_conversations AS conversation
      WHERE conversation.id = conversation_id
        AND conversation.organization_id = organization_id
    )
  );

CREATE POLICY pedagogical_messages_insert
  ON public.pedagogical_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = (SELECT auth.uid())
    AND private.can_access_pedagogical_conversation(conversation_id)
    AND EXISTS (
      SELECT 1 FROM public.pedagogical_conversations AS conversation
      WHERE conversation.id = conversation_id
        AND conversation.organization_id = organization_id
        AND conversation.status = 'open'
    )
  );

CREATE POLICY support_tickets_read
  ON public.support_tickets FOR SELECT TO authenticated
  USING (private.can_access_support_ticket(id));

CREATE POLICY support_tickets_insert
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    requester_user_id = (SELECT auth.uid())
    AND private.is_organization_member(organization_id)
  );

CREATE POLICY support_tickets_update
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (
    private.has_organization_role(organization_id, ARRAY['owner', 'admin', 'technician'])
  )
  WITH CHECK (
    private.has_organization_role(organization_id, ARRAY['owner', 'admin', 'technician'])
  );

CREATE POLICY support_messages_read
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    private.can_access_support_ticket(ticket_id)
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.organization_id = organization_id
    )
  );

CREATE POLICY support_messages_insert
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = (SELECT auth.uid())
    AND private.can_access_support_ticket(ticket_id)
    AND EXISTS (
      SELECT 1 FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.organization_id = organization_id
        AND ticket.status <> 'closed'
    )
  );

CREATE OR REPLACE FUNCTION private.touch_conversation_after_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.pedagogical_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.touch_ticket_after_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.touch_conversation_after_message() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.touch_ticket_after_message() FROM PUBLIC;

DROP TRIGGER IF EXISTS pedagogical_messages_touch_conversation
  ON public.pedagogical_messages;
CREATE TRIGGER pedagogical_messages_touch_conversation
AFTER INSERT ON public.pedagogical_messages
FOR EACH ROW EXECUTE FUNCTION private.touch_conversation_after_message();

DROP TRIGGER IF EXISTS support_messages_touch_ticket ON public.support_messages;
CREATE TRIGGER support_messages_touch_ticket
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION private.touch_ticket_after_message();

-- Restrict the existing private homework bucket to common voice/photo formats.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav',
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
    ]
WHERE id = 'homework';

CREATE OR REPLACE FUNCTION private.homework_object_user_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN (storage.foldername(p_name))[2]::uuid;
EXCEPTION WHEN invalid_text_representation OR array_subscript_error THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.homework_object_user_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.homework_object_user_id(text) TO authenticated;

DROP POLICY IF EXISTS homework_objects_read ON storage.objects;
DROP POLICY IF EXISTS homework_objects_delete ON storage.objects;

CREATE POLICY homework_objects_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'homework'
    AND private.is_organization_member(private.homework_object_organization_id(name))
    AND (
      (storage.foldername(name))[2] = (SELECT auth.uid()::text)
      OR private.is_linked_parent(
        private.homework_object_organization_id(name),
        private.homework_object_user_id(name)
      )
      OR private.can_manage_learning(private.homework_object_organization_id(name))
      OR private.can_teach_user(
        private.homework_object_organization_id(name),
        private.homework_object_user_id(name)
      )
    )
  );

CREATE POLICY homework_objects_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'homework'
    AND private.is_organization_member(private.homework_object_organization_id(name))
    AND (
      (
        owner_id = (SELECT auth.uid()::text)
        AND (storage.foldername(name))[2] = (SELECT auth.uid()::text)
      )
      OR private.can_manage_learning(private.homework_object_organization_id(name))
      OR private.can_teach_user(
        private.homework_object_organization_id(name),
        private.homework_object_user_id(name)
      )
    )
  );
