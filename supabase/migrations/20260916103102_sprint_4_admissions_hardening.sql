-- Sprint 4 hardening: cover every new foreign key used by operational queues
-- and cache auth.uid() once per RLS statement.

create index admission_events_actor_user_idx
  on public.admission_events (actor_user_id);
create index enrollment_applications_imported_batch_idx
  on public.enrollment_applications (imported_batch_id);
create index enrollment_applications_linked_learner_idx
  on public.enrollment_applications (linked_learner_id);
create index enrollment_applications_linked_user_idx
  on public.enrollment_applications (linked_user_id);

drop policy admission_events_insert on public.admission_events;
create policy admission_events_insert on public.admission_events for insert to authenticated
with check (
  private.can_read_admissions(organization_id)
  and actor_user_id = (select auth.uid())
  and event_type in ('note_added','bulk_action')
);

drop policy admission_payments_insert on public.admission_payments;
create policy admission_payments_insert on public.admission_payments for insert to authenticated
with check (
  private.can_manage_admission_finance(organization_id)
  and created_by = (select auth.uid())
);

drop policy admission_saved_filters_all on public.admission_saved_filters;
create policy admission_saved_filters_all on public.admission_saved_filters for all to authenticated
using (
  user_id = (select auth.uid())
  and private.can_read_admissions(organization_id)
)
with check (
  user_id = (select auth.uid())
  and private.can_read_admissions(organization_id)
);

drop policy admission_imports_insert on public.admission_import_batches;
create policy admission_imports_insert on public.admission_import_batches for insert to authenticated
with check (
  private.can_manage_admissions(organization_id)
  and created_by = (select auth.uid())
);
