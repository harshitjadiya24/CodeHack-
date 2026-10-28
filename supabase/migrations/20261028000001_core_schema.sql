-- Saajha core schema: organisations, people, resources, trust passport, bookings,
-- handovers, incidents, notifications and a tamper-evident audit chain.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('student', 'researcher', 'owner', 'attendant', 'manager', 'admin');
create type public.resource_kind as enum ('equipment', 'space');
create type public.demand_tier as enum ('normal', 'high');
create type public.resource_status as enum ('active', 'maintenance', 'retired');
create type public.booking_status as enum (
  'requested', 'in_draw', 'waitlisted', 'approved', 'rejected', 'cancelled',
  'checked_in', 'overdue', 'returned', 'closed'
);
create type public.handover_phase as enum ('check_in', 'return');
create type public.incident_type as enum ('damage', 'delay', 'conflict', 'misuse', 'safety');
create type public.incident_status as enum ('open', 'under_review', 'resolved');
create type public.severity as enum ('low', 'medium', 'high');
create type public.badge_status as enum ('pending', 'verified', 'rejected', 'expired');

-- ── Organisation ──────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
  created_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  name text not null,
  code text not null,
  unique (org_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  org_id uuid not null references public.organizations,
  dept_id uuid references public.departments,
  full_name text not null,
  roll_no text,
  role public.user_role not null default 'student',
  verified boolean not null default false,
  strikes int not null default 0 check (strikes >= 0),
  created_at timestamptz not null default now()
);

create table public.fairness_config (
  org_id uuid primary key references public.organizations on delete cascade,
  weekly_credits int not null default 20,
  max_active_high_demand int not null default 2,
  cooldown_hours int not null default 48,
  first_time_bonus numeric not null default 20,
  deadline_bonus numeric not null default 10,
  usage_penalty_per_hour numeric not null default 2,
  strike_penalty numeric not null default 15,
  updated_at timestamptz not null default now()
);

-- ── Trust Passport ────────────────────────────────────────────────────────────
create table public.skill_badges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  validity_days int not null default 365,
  unique (org_id, code)
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  badge_id uuid not null references public.skill_badges on delete cascade,
  status public.badge_status not null default 'pending',
  evidence_path text,
  note text,
  issued_by uuid references public.profiles,
  issued_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- ── Resources ─────────────────────────────────────────────────────────────────
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  dept_id uuid references public.departments,
  owner_id uuid not null references public.profiles,
  name text not null,
  kind public.resource_kind not null default 'equipment',
  category text not null,
  description text not null default '',
  location text not null,
  image_url text,
  rules text not null default '',
  demand public.demand_tier not null default 'normal',
  status public.resource_status not null default 'active',
  credit_rate int not null default 1 check (credit_rate >= 0),
  deposit_inr int not null default 0 check (deposit_inr >= 0),
  rental_value_inr_per_hour int not null default 0 check (rental_value_inr_per_hour >= 0),
  requires_supervision boolean not null default false,
  auto_approve boolean not null default false,
  max_hours int not null default 4 check (max_hours > 0),
  checklist jsonb not null default '[]'::jsonb,
  photo_slots jsonb not null default '["Front", "Control panel", "Accessories"]'::jsonb,
  qr_token text not null unique default encode(extensions.gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now()
);
create index on public.resources (org_id, status);

create table public.resource_requirements (
  resource_id uuid not null references public.resources on delete cascade,
  badge_id uuid not null references public.skill_badges on delete cascade,
  primary key (resource_id, badge_id)
);

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

-- ── Bookings ──────────────────────────────────────────────────────────────────
create table public.draw_windows (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  closes_at timestamptz not null,
  commit_hash text not null,
  seed text,
  status text not null default 'open' check (status in ('open', 'drawn')),
  results jsonb,
  drawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique (resource_id, slot_start)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  purpose text not null,
  deadline_note text,
  status public.booking_status not null default 'requested',
  credits int not null default 0,
  priority_score numeric,
  priority_breakdown jsonb,
  decision_receipt jsonb,
  decided_by uuid references public.profiles,
  decided_at timestamptz,
  waitlist_position int,
  draw_id uuid references public.draw_windows on delete set null,
  checked_in_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Double booking is impossible at the database level, whatever the app does.
  constraint bookings_no_overlap exclude using gist (resource_id with =, period with &&)
    where (status in ('approved', 'checked_in', 'overdue'))
);
create index on public.bookings (user_id, status);
create index on public.bookings (resource_id, starts_at);

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings on delete cascade,
  phase public.handover_phase not null,
  checklist jsonb not null default '{}'::jsonb,
  notes text not null default '',
  photo_paths text[] not null default '{}',
  recorded_by uuid not null references public.profiles,
  attendant_id uuid references public.profiles,
  attendant_confirmed_at timestamptz,
  ai_summary text,
  ai_flag boolean,
  created_at timestamptz not null default now(),
  unique (booking_id, phase)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete set null,
  resource_id uuid not null references public.resources on delete cascade,
  reported_by uuid references public.profiles,
  type public.incident_type not null,
  severity public.severity not null default 'medium',
  description text not null,
  status public.incident_status not null default 'open',
  ai_summary text,
  proposed_action text,
  decision text,
  strike_applied boolean not null default false,
  decided_by uuid references public.profiles,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ── Tamper-evident audit chain ────────────────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations,
  actor_id uuid references public.profiles,
  action text not null,
  entity text not null,
  entity_id uuid,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  prev_hash text not null,
  hash text not null
);
create index on public.audit_log (entity, entity_id);

-- Canonical string that gets hashed; verify_audit_chain() recomputes the same thing.
create function public.audit_digest_input(
  p_prev text, p_actor uuid, p_action text, p_entity text, p_entity_id uuid,
  p_reason text, p_payload jsonb, p_created timestamptz
) returns text language sql immutable as $$
  select concat_ws('|', p_prev, coalesce(p_actor::text, '-'), p_action, p_entity,
    coalesce(p_entity_id::text, '-'), coalesce(p_reason, '-'), p_payload::text,
    to_char(p_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'))
$$;

create function public.audit_chain_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prev text;
begin
  -- Serialise writers so two inserts never chain onto the same parent.
  perform pg_advisory_xact_lock(hashtext('saajha_audit_chain'));
  select hash into v_prev from public.audit_log order by id desc limit 1;
  new.prev_hash := coalesce(v_prev, repeat('0', 64));
  new.created_at := coalesce(new.created_at, now());
  new.hash := encode(extensions.digest(public.audit_digest_input(new.prev_hash, new.actor_id, new.action,
    new.entity, new.entity_id, new.reason, new.payload, new.created_at), 'sha256'), 'hex');
  return new;
end $$;

create trigger audit_chain_hash before insert on public.audit_log
  for each row execute function public.audit_chain_before_insert();

create function public.audit_log_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- Returns the first broken row id, or null when the whole chain verifies.
create function public.verify_audit_chain()
returns table (ok boolean, checked bigint, broken_at bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  v_prev text := repeat('0', 64);
  v_count bigint := 0;
begin
  for r in select * from public.audit_log order by id loop
    v_count := v_count + 1;
    if r.prev_hash <> v_prev or r.hash <> encode(extensions.digest(public.audit_digest_input(r.prev_hash,
        r.actor_id, r.action, r.entity, r.entity_id, r.reason, r.payload, r.created_at), 'sha256'), 'hex') then
      return query select false, v_count, r.id;
      return;
    end if;
    v_prev := r.hash;
  end loop;
  return query select true, v_count, null::bigint;
end $$;
