alter table public.live_sessions
  add column if not exists notification_revision integer not null default 1;

create table public.live_session_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  kind text not null check (kind in (
    'invitation', 'updated', 'cancelled', 'reminder_24h', 'reminder_1h', 'replay'
  )),
  revision integer not null default 1,
  status text not null default 'queued' check (status in (
    'queued', 'sending', 'sent', 'failed', 'skipped'
  )),
  attempts integer not null default 0,
  scheduled_for timestamptz not null default now(),
  next_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_session_email_deliveries_revision_positive check (revision > 0),
  constraint live_session_email_deliveries_attempts_nonnegative check (attempts >= 0),
  constraint live_session_email_deliveries_email_not_blank check (btrim(recipient_email) <> ''),
  unique (live_session_id, recipient_email, kind, revision)
);

create index live_session_email_deliveries_due_idx
  on public.live_session_email_deliveries (scheduled_for, next_attempt_at)
  where status in ('queued', 'failed');

create index live_session_email_deliveries_organization_idx
  on public.live_session_email_deliveries (organization_id, created_at desc);

create index live_session_email_deliveries_session_idx
  on public.live_session_email_deliveries (live_session_id, kind, status);

alter table public.live_session_email_deliveries enable row level security;

revoke all on table public.live_session_email_deliveries from anon;
revoke all on table public.live_session_email_deliveries from authenticated;
grant select on table public.live_session_email_deliveries to authenticated;
grant all on table public.live_session_email_deliveries to service_role;

create policy "Managers can view notification deliveries"
  on public.live_session_email_deliveries
  for select
  to authenticated
  using (private.can_manage_learning(organization_id));

create or replace function private.bump_live_notification_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    new.title,
    new.description,
    new.provider,
    new.join_url,
    new.starts_at,
    new.ends_at,
    new.timezone,
    new.course_id,
    new.cohort_id,
    new.status,
    new.replay_url
  ) is distinct from row(
    old.title,
    old.description,
    old.provider,
    old.join_url,
    old.starts_at,
    old.ends_at,
    old.timezone,
    old.course_id,
    old.cohort_id,
    old.status,
    old.replay_url
  ) then
    new.notification_revision := old.notification_revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists live_sessions_bump_notification_revision on public.live_sessions;
create trigger live_sessions_bump_notification_revision
  before update on public.live_sessions
  for each row
  execute function private.bump_live_notification_revision();

create or replace function public.claim_due_live_email_notifications(p_limit integer default 50)
returns table (
  delivery_id uuid,
  organization_id uuid,
  live_session_id uuid,
  recipient_email text,
  recipient_name text,
  kind text,
  title text,
  description text,
  provider text,
  join_url text,
  replay_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  course_title text,
  cohort_name text,
  organization_name text,
  attempt integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.live_session_email_deliveries
  set status = 'failed',
      next_attempt_at = now(),
      last_error = 'Envoi interrompu avant confirmation.',
      updated_at = now()
  where status = 'sending'
    and updated_at < now() - interval '15 minutes';

  with session_events as (
    select s.*, e.kind, e.scheduled_for
    from public.live_sessions s
    cross join lateral (
      select 'invitation'::text as kind, s.created_at as scheduled_for
      where s.notification_revision = 1
        and s.status in ('scheduled', 'live')
        and s.starts_at > now()
      union all
      select 'updated', s.updated_at
      where s.notification_revision > 1
        and s.status in ('scheduled', 'live')
        and s.starts_at > now()
      union all
      select 'cancelled', s.updated_at
      where s.status = 'cancelled'
      union all
      select 'reminder_24h', s.starts_at - interval '24 hours'
      where s.status = 'scheduled'
        and s.starts_at > now()
        and s.starts_at - interval '24 hours' >= s.created_at
      union all
      select 'reminder_1h', s.starts_at - interval '1 hour'
      where s.status = 'scheduled'
        and s.starts_at > now()
        and s.starts_at - interval '1 hour' >= s.created_at
      union all
      select 'replay', s.updated_at
      where s.status = 'completed'
        and nullif(btrim(s.replay_url), '') is not null
    ) e
    where e.scheduled_for <= now()
  ), learner_access as (
    select distinct se.id as live_session_id, lp.user_id, coalesce(p.email, lp.email) as email,
      coalesce(p.preferred_name, p.full_name, lp.preferred_name, lp.full_name) as name
    from session_events se
    join public.learner_cohort_memberships lcm
      on lcm.organization_id = se.organization_id
      and lcm.status = 'active'
      and (
        lcm.cohort_id = se.cohort_id
        or (se.cohort_id is null and se.course_id is not null and exists (
          select 1 from public.course_cohorts cc
          where cc.organization_id = se.organization_id
            and cc.course_id = se.course_id
            and cc.cohort_id = lcm.cohort_id
        ))
      )
    join public.learner_profiles lp
      on lp.id = lcm.learner_id
      and lp.organization_id = se.organization_id
      and lp.status = 'active'
    left join public.profiles p on p.id = lp.user_id
    union
    select distinct se.id, ce.user_id, p.email,
      coalesce(p.preferred_name, p.full_name)
    from session_events se
    join public.course_enrollments ce
      on ce.organization_id = se.organization_id
      and ce.course_id = se.course_id
      and ce.status in ('active', 'completed')
    join public.profiles p on p.id = ce.user_id
    where se.cohort_id is null
      and se.course_id is not null
    union
    select distinct se.id, om.user_id, p.email,
      coalesce(p.preferred_name, p.full_name)
    from session_events se
    join public.organization_memberships om
      on om.organization_id = se.organization_id
      and om.status = 'active'
      and om.role in ('learner', 'parent')
    join public.profiles p on p.id = om.user_id
    where se.cohort_id is null
      and se.course_id is null
  ), guardians as (
    select distinct se.id as live_session_id, lp.guardian_user_id as user_id, gp.email,
      coalesce(gp.preferred_name, gp.full_name) as name
    from session_events se
    join public.learner_cohort_memberships lcm
      on lcm.organization_id = se.organization_id
      and lcm.status = 'active'
      and (
        lcm.cohort_id = se.cohort_id
        or (se.cohort_id is null and se.course_id is not null and exists (
          select 1 from public.course_cohorts cc
          where cc.organization_id = se.organization_id
            and cc.course_id = se.course_id
            and cc.cohort_id = lcm.cohort_id
        ))
      )
    join public.learner_profiles lp
      on lp.id = lcm.learner_id
      and lp.organization_id = se.organization_id
      and lp.status = 'active'
      and lp.guardian_user_id is not null
    join public.profiles gp on gp.id = lp.guardian_user_id
  ), recipients as (
    select * from learner_access
    union
    select * from guardians
  )
  insert into public.live_session_email_deliveries (
    organization_id,
    live_session_id,
    recipient_user_id,
    recipient_email,
    recipient_name,
    kind,
    revision,
    scheduled_for
  )
  select distinct
    se.organization_id,
    se.id,
    r.user_id,
    lower(btrim(r.email)),
    r.name,
    se.kind,
    se.notification_revision,
    se.scheduled_for
  from session_events se
  join recipients r on r.live_session_id = se.id
  where nullif(btrim(r.email), '') is not null
    and not (
      se.kind in ('reminder_24h', 'reminder_1h', 'cancelled')
      and exists (
        select 1
        from public.live_session_email_deliveries previous
        where previous.live_session_id = se.id
          and previous.recipient_email = lower(btrim(r.email))
          and previous.kind = se.kind
          and previous.status in ('queued', 'sending', 'sent')
      )
    )
  on conflict (live_session_id, recipient_email, kind, revision) do nothing;

  return query
  with due as (
    select d.id
    from public.live_session_email_deliveries d
    where d.status in ('queued', 'failed')
      and d.scheduled_for <= now()
      and coalesce(d.next_attempt_at, d.scheduled_for) <= now()
      and d.attempts < 6
    order by d.scheduled_for, d.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ), claimed as (
    update public.live_session_email_deliveries d
    set status = 'sending',
        attempts = d.attempts + 1,
        updated_at = now(),
        last_error = null
    from due
    where d.id = due.id
    returning d.*
  )
  select
    c.id,
    c.organization_id,
    c.live_session_id,
    c.recipient_email,
    c.recipient_name,
    c.kind,
    s.title,
    s.description,
    s.provider,
    s.join_url,
    s.replay_url,
    s.starts_at,
    s.ends_at,
    s.timezone,
    course.title,
    cohort.name,
    organization.name,
    c.attempts
  from claimed c
  join public.live_sessions s on s.id = c.live_session_id
  join public.organizations organization on organization.id = c.organization_id
  left join public.courses course on course.id = s.course_id
  left join public.cohorts cohort on cohort.id = s.cohort_id;
end;
$$;

revoke all on function public.claim_due_live_email_notifications(integer) from public;
revoke all on function public.claim_due_live_email_notifications(integer) from anon;
revoke all on function public.claim_due_live_email_notifications(integer) from authenticated;
grant execute on function public.claim_due_live_email_notifications(integer) to service_role;

comment on table public.live_session_email_deliveries is
  'File durable et journal des notifications e-mail liées aux cours en direct.';
comment on function public.claim_due_live_email_notifications(integer) is
  'Matérialise les notifications dues et les réserve atomiquement au worker Brevo.';
