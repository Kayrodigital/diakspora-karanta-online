-- Sprint 2: publish a deliberately small cohort catalogue and collect
-- admission requests before account creation. Personal data is never readable
-- by anonymous callers.

alter table public.cohorts
  add column if not exists is_public boolean not null default false,
  add column if not exists audience text,
  add column if not exists objective text,
  add column if not exists teaching_languages text[] not null default '{}'::text[],
  add column if not exists schedule_label text,
  add column if not exists session_period text,
  add column if not exists delivery_format text,
  add column if not exists enrollment_status text not null default 'closed',
  add column if not exists public_summary text,
  add column if not exists price_cents integer;

alter table public.cohorts
  add constraint cohorts_audience_check check (
    audience is null or audience in (
      'child', 'teen_female', 'teen_male', 'adult_female', 'adult_male'
    )
  ),
  add constraint cohorts_objective_check check (
    objective is null or objective in (
      'arabic_literacy', 'arabic_language', 'quran_tajwid',
      'islamic_studies', 'advanced_texts'
    )
  ),
  add constraint cohorts_session_period_check check (
    session_period is null or session_period in ('morning', 'daytime', 'evening', 'weekend')
  ),
  add constraint cohorts_delivery_format_check check (
    delivery_format is null or delivery_format in ('live', 'hybrid', 'on_demand')
  ),
  add constraint cohorts_enrollment_status_check check (
    enrollment_status in ('open', 'waitlist', 'closed')
  ),
  add constraint cohorts_price_check check (price_cents is null or price_cents >= 0),
  add constraint cohorts_public_fields_check check (
    not is_public
    or (
      audience is not null
      and objective is not null
      and level is not null
      and schedule_label is not null
      and session_period is not null
      and delivery_format is not null
      and cardinality(teaching_languages) > 0
    )
  );

create index if not exists cohorts_public_catalog_idx
  on public.cohorts (organization_id, audience, objective, level)
  where is_public and status = 'active';

create table public.enrollment_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  audience text not null check (audience in (
    'child', 'teen_female', 'teen_male', 'adult_female', 'adult_male'
  )),
  objective text not null check (objective in (
    'arabic_literacy', 'arabic_language', 'quran_tajwid',
    'islamic_studies', 'advanced_texts'
  )),
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'unsure')),
  availability text not null check (availability in ('morning', 'daytime', 'evening', 'weekend')),
  accompaniment_language text not null check (
    accompaniment_language in ('fr', 'ar', 'diakhanke')
  ),
  applicant_name text not null check (char_length(applicant_name) between 2 and 120),
  learner_name text check (learner_name is null or char_length(learner_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  phone text not null check (char_length(phone) between 6 and 32),
  preferred_contact text not null default 'whatsapp'
    check (preferred_contact in ('whatsapp', 'phone', 'email')),
  notes text check (notes is null or char_length(notes) <= 1000),
  privacy_consent boolean not null check (privacy_consent),
  source text not null default 'public_site',
  status text not null default 'new' check (status in (
    'new', 'contacted', 'qualified', 'cohort_proposed', 'payment_pending',
    'confirmed', 'declined', 'withdrawn'
  )),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index enrollment_applications_queue_idx
  on public.enrollment_applications (organization_id, status, created_at desc);
create index enrollment_applications_cohort_idx
  on public.enrollment_applications (cohort_id);
create index enrollment_applications_assigned_to_idx
  on public.enrollment_applications (assigned_to);

alter table public.enrollment_applications enable row level security;
revoke all on public.enrollment_applications from public, anon, authenticated;
grant select, update on public.enrollment_applications to authenticated;
grant all on public.enrollment_applications to service_role;

create policy enrollment_applications_staff_read
  on public.enrollment_applications for select to authenticated
  using (
    private.has_organization_role(
      organization_id,
      array['owner', 'admin', 'technician', 'pedagogical_manager', 'class_manager']
    )
    or private.is_platform_administrator()
  );

create policy enrollment_applications_staff_update
  on public.enrollment_applications for update to authenticated
  using (
    private.has_organization_role(
      organization_id,
      array['owner', 'admin', 'technician', 'pedagogical_manager', 'class_manager']
    )
    or private.is_platform_administrator()
  )
  with check (
    private.has_organization_role(
      organization_id,
      array['owner', 'admin', 'technician', 'pedagogical_manager', 'class_manager']
    )
    or private.is_platform_administrator()
  );

create table private.enrollment_request_limits (
  ip_address inet not null,
  requested_at timestamptz not null default now()
);
create index enrollment_request_limits_lookup_idx
  on private.enrollment_request_limits (ip_address, requested_at desc);
revoke all on private.enrollment_request_limits from public, anon, authenticated;

create or replace function public.list_public_cohorts(
  p_organization_slug text default 'diakspora'
)
returns table (
  id uuid,
  name text,
  public_summary text,
  audience text,
  objective text,
  level text,
  teaching_languages text[],
  schedule_label text,
  session_period text,
  starts_on date,
  timezone text,
  delivery_format text,
  price_cents integer,
  availability text,
  remaining_places integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    cohort.id,
    cohort.name,
    cohort.public_summary,
    cohort.audience,
    cohort.objective,
    cohort.level,
    cohort.teaching_languages,
    cohort.schedule_label,
    cohort.session_period,
    cohort.starts_on,
    cohort.timezone,
    cohort.delivery_format,
    cohort.price_cents,
    case
      when cohort.enrollment_status = 'closed' then 'closed'
      when cohort.enrollment_status = 'waitlist' then 'waitlist'
      when cohort.max_students is not null and count(membership.id) >= cohort.max_students then 'full'
      else 'open'
    end as availability,
    case
      when cohort.max_students is null then null
      else greatest(cohort.max_students - count(membership.id)::integer, 0)
    end as remaining_places
  from public.cohorts as cohort
  join public.organizations as organization
    on organization.id = cohort.organization_id
  left join public.learner_cohort_memberships as membership
    on membership.cohort_id = cohort.id
   and membership.status = 'active'
  where organization.slug = p_organization_slug
    and organization.status = 'active'
    and cohort.status = 'active'
    and cohort.is_public
  group by cohort.id
  order by cohort.starts_on nulls last, cohort.name;
$$;

revoke all on function public.list_public_cohorts(text) from public;
grant execute on function public.list_public_cohorts(text) to anon, authenticated, service_role;

create or replace function public.submit_enrollment_application(
  p_organization_slug text,
  p_cohort_id uuid,
  p_audience text,
  p_objective text,
  p_level text,
  p_availability text,
  p_accompaniment_language text,
  p_applicant_name text,
  p_learner_name text,
  p_email text,
  p_phone text,
  p_preferred_contact text,
  p_notes text,
  p_privacy_consent boolean,
  p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_application_id uuid;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip_text text;
  v_ip inet;
begin
  if nullif(trim(coalesce(p_website, '')), '') is not null then
    raise exception 'Demande invalide.';
  end if;

  if p_audience not in ('child', 'teen_female', 'teen_male', 'adult_female', 'adult_male')
    or p_objective not in (
      'arabic_literacy', 'arabic_language', 'quran_tajwid',
      'islamic_studies', 'advanced_texts'
    )
    or p_level not in ('beginner', 'intermediate', 'advanced', 'unsure')
    or p_availability not in ('morning', 'daytime', 'evening', 'weekend')
    or p_accompaniment_language not in ('fr', 'ar', 'diakhanke')
    or p_preferred_contact not in ('whatsapp', 'phone', 'email') then
    raise exception 'Les critères de la demande sont invalides.';
  end if;

  if char_length(trim(coalesce(p_applicant_name, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_email, ''))) not between 5 and 254
    or position('@' in p_email) < 2
    or char_length(trim(coalesce(p_phone, ''))) not between 6 and 32
    or char_length(coalesce(p_notes, '')) > 1000
    or not coalesce(p_privacy_consent, false) then
    raise exception 'Les coordonnées ou le consentement sont invalides.';
  end if;

  select organization.id into v_organization_id
  from public.organizations as organization
  where organization.slug = p_organization_slug
    and organization.status = 'active';

  if v_organization_id is null then
    raise exception 'Organisation introuvable.';
  end if;

  if p_cohort_id is not null and not exists (
    select 1 from public.cohorts as cohort
    where cohort.id = p_cohort_id
      and cohort.organization_id = v_organization_id
      and cohort.status = 'active'
      and cohort.is_public
      and cohort.enrollment_status in ('open', 'waitlist')
  ) then
    raise exception 'Cette cohorte ne reçoit pas de demandes actuellement.';
  end if;

  v_ip_text := nullif(
    trim(coalesce(v_headers ->> 'cf-connecting-ip', split_part(v_headers ->> 'x-forwarded-for', ',', 1))),
    ''
  );

  if v_ip_text is not null then
    begin
      v_ip := v_ip_text::inet;
    exception when invalid_text_representation then
      v_ip := null;
    end;
  end if;

  if v_ip is not null then
    delete from private.enrollment_request_limits
    where requested_at < now() - interval '1 day';

    if (
      select count(*) from private.enrollment_request_limits
      where ip_address = v_ip
        and requested_at >= now() - interval '1 hour'
    ) >= 5 then
      raise exception 'Trop de demandes ont été envoyées. Réessayez dans une heure.';
    end if;

    insert into private.enrollment_request_limits (ip_address) values (v_ip);
  end if;

  insert into public.enrollment_applications (
    organization_id,
    cohort_id,
    audience,
    objective,
    level,
    availability,
    accompaniment_language,
    applicant_name,
    learner_name,
    email,
    phone,
    preferred_contact,
    notes,
    privacy_consent
  ) values (
    v_organization_id,
    p_cohort_id,
    p_audience,
    p_objective,
    p_level,
    p_availability,
    p_accompaniment_language,
    trim(p_applicant_name),
    nullif(trim(coalesce(p_learner_name, '')), ''),
    lower(trim(p_email)),
    trim(p_phone),
    p_preferred_contact,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_privacy_consent
  ) returning id into v_application_id;

  return v_application_id;
end;
$$;

revoke all on function public.submit_enrollment_application(
  text, uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, text
) from public;
grant execute on function public.submit_enrollment_application(
  text, uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, text
) to anon, authenticated, service_role;
